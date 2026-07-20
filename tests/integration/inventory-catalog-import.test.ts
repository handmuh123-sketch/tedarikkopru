import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listAdminImports } from "@/app/api/v1/admin/imports/route";
import {
  DELETE as removeFavorite,
  POST as addFavorite,
} from "@/app/api/v1/favorites/products/[productId]/route";
import { POST as confirmImport } from "@/app/api/v1/organizations/[organizationId]/imports/[jobId]/confirm/route";
import { POST as previewImport } from "@/app/api/v1/organizations/[organizationId]/imports/preview/route";
import { PATCH as adjustStock } from "@/app/api/v1/organizations/[organizationId]/inventory/[variantId]/route";
import { GET as exportProducts } from "@/app/api/v1/organizations/[organizationId]/products/export/route";
import { POST as createProduct } from "@/app/api/v1/organizations/[organizationId]/products/route";
import { GET as listPublicProducts } from "@/app/api/v1/products/route";
import { POST as createOrganization } from "@/app/api/v1/organizations/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Inventory-Integration-2026!";

function request(path: string, method: string, body?: unknown, cookie?: string) {
  return new Request(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      origin: baseUrl,
      "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200 + 1)}`,
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = `inventory-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Inventory ${label}`,
      email,
      password,
      callbackURL: "/panel",
    }),
  );
  const user = await database.user.findUniqueOrThrow({ where: { email } });
  await database.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  const login = await auth.handler(
    request("/api/auth/sign-in/email", "POST", { email, password, callbackURL: "/panel" }),
  );
  return { user, cookie: (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "" };
}

async function organization(cookie: string, label: string) {
  const response = await createOrganization(
    request(
      `/api/v1/organizations`,
      "POST",
      {
        type: "SUPPLIER",
        legalName: `${label} Limited Şirketi`,
        tradeName: label,
        slug: `${label.toLowerCase()}-${randomUUID()}`,
        taxNumber: String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999)),
        taxOffice: "Kadıköy",
        phone: "+90 212 555 0606",
        email: `${randomUUID()}@example.test`,
        authorizedPerson: "Stok Yetkilisi",
      },
      cookie,
    ),
  );
  const id = (await response.json()).data.id as string;
  await database.organization.update({
    where: { id },
    data: { status: "ACTIVE", verificationStatus: "APPROVED", verifiedAt: new Date() },
  });
  return id;
}

describe("Faz 2B gerçek PostgreSQL stok, keşif, favori ve import", () => {
  let admin: Awaited<ReturnType<typeof register>>;
  let ownerA: Awaited<ReturnType<typeof register>>;
  let ownerB: Awaited<ReturnType<typeof register>>;
  let buyer: Awaited<ReturnType<typeof register>>;
  let orgA: string;
  let orgB: string;
  let category: { id: string; slug: string; path: string; name: string };
  let brand: { id: string; slug: string; name: string };
  let productId: string;
  let variantId: string;
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    await database.$connect();
    [admin, ownerA, ownerB, buyer] = await Promise.all([
      register("admin"),
      register("owner-a"),
      register("owner-b"),
      register("buyer"),
    ]);
    await database.user.update({
      where: { id: admin.user.id },
      data: { platformRole: "PLATFORM_ADMIN" },
    });
    orgA = await organization(ownerA.cookie, "InventoryA");
    orgB = await organization(ownerB.cookie, "InventoryB");
    category = await database.category.create({
      data: {
        name: `Stok Kategori ${suffix}`,
        slug: `stok-kategori-${suffix}`,
        path: `stok-kategori-${suffix}`,
      },
    });
    brand = await database.brand.create({
      data: { name: `Stok Marka ${suffix}`, slug: `stok-marka-${suffix}` },
    });
    const created = await createProduct(
      request(
        `/api/v1/organizations/${orgA}/products`,
        "POST",
        {
          categoryId: category.id,
          brandId: brand.id,
          title: `Aranabilir Pilot Kablo ${suffix}`,
          slug: `aranabilir-pilot-kablo-${suffix}`,
          shortDescription: "Arama ve güvenli stok testi için pilot aksesuar.",
          description:
            "Arama, filtre, favori ve stok güvenliği entegrasyon testinde kullanılan yeterince uzun ürün açıklaması.",
          originCountry: "TR",
          vatRateBasisPoints: 2000,
          warrantyMonths: 24,
          handlingDays: 2,
          variant: {
            sku: `INV-${suffix}`.toUpperCase(),
            title: "Standart",
            packageQuantity: 1,
            moq: 5,
            quantityStep: 5,
            priceAmountMinor: 15990,
          },
        },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA }) },
    );
    const product = (await created.json()).data as { id: string; variants: Array<{ id: string }> };
    productId = product.id;
    variantId = product.variants[0]!.id;
    await database.product.update({
      where: { id: productId },
      data: { status: "ACTIVE", publishedAt: new Date() },
    });
  }, 40_000);

  afterAll(async () => database.$disconnect());

  it("negatif/stale ve başka org stok yazımını engeller; movement append-only kalır", async () => {
    const first = await adjustStock(
      request(
        `/api/v1/organizations/${orgA}/inventory/${variantId}`,
        "PATCH",
        { onHand: 10, safetyStock: 10, version: 0, reason: "İlk sayım" },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, variantId }) },
    );
    expect(first.status).toBe(200);
    const hidden = await listPublicProducts(new Request(`${baseUrl}/api/v1/products?q=${suffix}`));
    expect(JSON.stringify((await hidden.json()).data)).not.toContain(productId);
    const crossWrite = await adjustStock(
      request(
        `/api/v1/organizations/${orgB}/inventory/${variantId}`,
        "PATCH",
        { onHand: 999, safetyStock: 0, version: 1, reason: "Yetkisiz" },
        ownerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgB, variantId }) },
    );
    expect(crossWrite.status).toBe(404);
    const negative = await adjustStock(
      request(
        `/api/v1/organizations/${orgA}/inventory/${variantId}`,
        "PATCH",
        { onHand: -1, safetyStock: 0, version: 1, reason: "Negatif" },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, variantId }) },
    );
    expect(negative.status).toBe(422);
    const available = await adjustStock(
      request(
        `/api/v1/organizations/${orgA}/inventory/${variantId}`,
        "PATCH",
        { onHand: 25, safetyStock: 3, version: 1, reason: "Yeni sayım" },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, variantId }) },
    );
    expect(available.status).toBe(200);
    const stale = await adjustStock(
      request(
        `/api/v1/organizations/${orgA}/inventory/${variantId}`,
        "PATCH",
        { onHand: 30, safetyStock: 3, version: 1, reason: "Eski ekran" },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, variantId }) },
    );
    expect(stale.status).toBe(409);
    const concurrent = await Promise.all([
      adjustStock(
        request(
          `/api/v1/organizations/${orgA}/inventory/${variantId}`,
          "PATCH",
          { onHand: 26, safetyStock: 3, version: 2, reason: "Eşzamanlı A" },
          ownerA.cookie,
        ),
        { params: Promise.resolve({ organizationId: orgA, variantId }) },
      ),
      adjustStock(
        request(
          `/api/v1/organizations/${orgA}/inventory/${variantId}`,
          "PATCH",
          { onHand: 27, safetyStock: 3, version: 2, reason: "Eşzamanlı B" },
          ownerA.cookie,
        ),
        { params: Promise.resolve({ organizationId: orgA, variantId }) },
      ),
    ]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 409]);
    const inventory = await database.inventory.findUniqueOrThrow({ where: { variantId } });
    await expect(
      database.$executeRaw`UPDATE "inventories" SET "on_hand" = -1 WHERE "id" = ${inventory.id}`,
    ).rejects.toThrow();
    const movement = await database.inventoryMovement.findFirstOrThrow({
      where: { inventory: { variantId } },
      orderBy: { createdAt: "desc" },
    });
    await expect(
      database.inventoryMovement.update({
        where: { id: movement.id },
        data: { reason: "değiştir" },
      }),
    ).rejects.toThrow();
    await expect(
      database.auditLog.findFirst({ where: { action: "inventory.adjusted", targetId: variantId } }),
    ).resolves.not.toBeNull();
  });

  it("arama/filtre ve kullanıcı-scoped favoriyi yalnız kullanılabilir üründe uygular", async () => {
    const listed = await listPublicProducts(
      new Request(
        `${baseUrl}/api/v1/products?q=Aranabilir&category=${category.slug}&brand=${brand.slug}&minPrice=150&maxPrice=170&inStock=1`,
      ),
    );
    const publicPayload = JSON.stringify((await listed.json()).data);
    expect(publicPayload).toContain(productId);
    expect(publicPayload).not.toContain("taxNumberEncrypted");
    expect(publicPayload).not.toContain("taxNumberHash");
    expect(publicPayload).not.toContain("safetyStock");
    const wrongPrice = await listPublicProducts(
      new Request(`${baseUrl}/api/v1/products?maxPrice=100`),
    );
    expect(JSON.stringify((await wrongPrice.json()).data)).not.toContain(productId);
    expect(
      (
        await addFavorite(
          request(`/api/v1/favorites/products/${productId}`, "POST", undefined, buyer.cookie),
          { params: Promise.resolve({ productId }) },
        )
      ).status,
    ).toBe(200);
    expect(
      await database.productFavorite.count({ where: { userId: buyer.user.id, productId } }),
    ).toBe(1);
    await removeFavorite(
      request(`/api/v1/favorites/products/${productId}`, "DELETE", undefined, ownerB.cookie),
      { params: Promise.resolve({ productId }) },
    );
    expect(
      await database.productFavorite.count({ where: { userId: buyer.user.id, productId } }),
    ).toBe(1);
    await removeFavorite(
      request(`/api/v1/favorites/products/${productId}`, "DELETE", undefined, buyer.cookie),
      { params: Promise.resolve({ productId }) },
    );
    expect(
      await database.productFavorite.count({ where: { userId: buyer.user.id, productId } }),
    ).toBe(0);
  });

  it("önizlemeden önce yazmaz, satır hatası verir, org scope ve idempotent confirm uygular", async () => {
    const importSku = `IMPORT-${randomUUID().slice(0, 8)}`.toUpperCase();
    const csv = [
      "supplier_sku,title,brand,category_path,variant_name,description,vat_rate,unit_price,moq,quantity_step,stock,safety_stock,handling_days",
      `${importSku},=Import Pilot Kablo,${brand.name},${category.path},Standart,Import önizleme ve güvenlik testi için yeterince uzun açıklama,20,199.90,5,5,44,4,2`,
      `BAD-${suffix},Hatalı Ürün,Bilinmeyen,olmayan,Standart,kısa,20,0,0,0,-1,0,2`,
    ].join("\n");
    const form = new FormData();
    form.set("file", new File([csv], "pilot.csv", { type: "text/csv" }));
    const previewRequest = new Request(`${baseUrl}/api/v1/organizations/${orgA}/imports/preview`, {
      method: "POST",
      headers: { cookie: ownerA.cookie, origin: baseUrl, "x-forwarded-for": "203.0.113.230" },
      body: form,
    });
    expect(
      await database.productVariant.count({
        where: { supplierOrganizationId: orgA, sku: importSku },
      }),
    ).toBe(0);
    const preview = await previewImport(previewRequest, {
      params: Promise.resolve({ organizationId: orgA }),
    });
    expect(preview.status).toBe(201);
    const job = (await preview.json()).data as {
      id: string;
      validRows: number;
      invalidRows: number;
    };
    expect(job).toMatchObject({ validRows: 1, invalidRows: 1 });
    expect(
      await database.productVariant.count({
        where: { supplierOrganizationId: orgA, sku: importSku },
      }),
    ).toBe(0);
    const crossConfirm = await confirmImport(
      request(
        `/api/v1/organizations/${orgB}/imports/${job.id}/confirm`,
        "POST",
        undefined,
        ownerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgB, jobId: job.id }) },
    );
    expect(crossConfirm.status).toBe(404);
    const confirmed = await confirmImport(
      request(
        `/api/v1/organizations/${orgA}/imports/${job.id}/confirm`,
        "POST",
        undefined,
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, jobId: job.id }) },
    );
    expect(confirmed.status).toBe(200);
    const repeated = await confirmImport(
      request(
        `/api/v1/organizations/${orgA}/imports/${job.id}/confirm`,
        "POST",
        undefined,
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, jobId: job.id }) },
    );
    expect(repeated.status).toBe(200);
    expect(
      await database.productVariant.count({
        where: { supplierOrganizationId: orgA, sku: importSku },
      }),
    ).toBe(1);
    const exported = await exportProducts(
      request(`/api/v1/organizations/${orgA}/products/export`, "GET", undefined, ownerA.cookie),
      { params: Promise.resolve({ organizationId: orgA }) },
    );
    expect(exported.headers.get("cache-control")).toContain("no-store");
    expect(await exported.text()).toContain("'=Import Pilot Kablo");
    expect(
      (await listAdminImports(request("/api/v1/admin/imports", "GET", undefined, ownerA.cookie)))
        .status,
    ).toBe(403);
    expect(
      (await listAdminImports(request("/api/v1/admin/imports", "GET", undefined, admin.cookie)))
        .status,
    ).toBe(200);
  }, 40_000);
});
