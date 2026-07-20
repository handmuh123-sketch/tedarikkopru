import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createBrand } from "@/app/api/v1/admin/brands/route";
import { POST as createCategory } from "@/app/api/v1/admin/categories/route";
import { POST as moderateProduct } from "@/app/api/v1/admin/products/[productId]/moderate/route";
import { PATCH as updateProduct } from "@/app/api/v1/organizations/[organizationId]/products/[productId]/route";
import { POST as submitProduct } from "@/app/api/v1/organizations/[organizationId]/products/[productId]/submit/route";
import { POST as createProduct } from "@/app/api/v1/organizations/[organizationId]/products/route";
import { GET as getPublicProduct } from "@/app/api/v1/products/[slug]/route";
import { GET as listPublicProducts } from "@/app/api/v1/products/route";
import { POST as createOrganization } from "@/app/api/v1/organizations/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Catalog-Integration-2026!";

function apiRequest(path: string, body: unknown, cookie?: string) {
  return new Request(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 1)}`,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function register(label: string) {
  const email = `catalog-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    apiRequest("/api/auth/sign-up/email", {
      name: `Catalog ${label}`,
      email,
      password,
      callbackURL: "/panel",
    }),
  );
  const user = await database.user.findUniqueOrThrow({ where: { email } });
  await database.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  const login = await auth.handler(
    apiRequest("/api/auth/sign-in/email", { email, password, callbackURL: "/panel" }),
  );
  return { user, cookie: (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "" };
}

async function organization(cookie: string, label: string, approved: boolean) {
  const response = await createOrganization(
    apiRequest(
      "/api/v1/organizations",
      {
        type: "SUPPLIER",
        legalName: `${label} Limited Şirketi`,
        tradeName: label,
        slug: `${label.toLowerCase()}-${randomUUID()}`,
        taxNumber: String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999)),
        taxOffice: "Kadıköy",
        phone: "+90 212 555 0404",
        email: `${randomUUID()}@example.test`,
        authorizedPerson: "Pilot Yetkili",
      },
      cookie,
    ),
  );
  const id = (await response.json()).data.id as string;
  if (approved)
    await database.organization.update({
      where: { id },
      data: { status: "ACTIVE", verificationStatus: "APPROVED", verifiedAt: new Date() },
    });
  return id;
}

function productBody(
  categoryId: string,
  brandId: string,
  suffix: string,
  priceAmountMinor = 12990,
) {
  return {
    categoryId,
    brandId,
    title: `Pilot Kablo ${suffix}`,
    slug: `pilot-kablo-${suffix}`,
    shortDescription: "Dayanıklı hızlı şarj destekli pilot USB-C kablo.",
    description:
      "Doğrulanmış tedarikçi tarafından satışa sunulan, örgülü ve hızlı şarj destekli pilot USB-C kablo ürünü.",
    originCountry: "TR",
    vatRateBasisPoints: 2000,
    warrantyMonths: 24,
    handlingDays: 2,
    variant: {
      sku: `SKU-${suffix}`.toUpperCase(),
      title: "Standart",
      packageQuantity: 1,
      moq: 10,
      quantityStep: 5,
      priceAmountMinor,
    },
  };
}

describe("Faz 2A gerçek PostgreSQL katalog pilotu", () => {
  let admin: Awaited<ReturnType<typeof register>>;
  let ownerA: Awaited<ReturnType<typeof register>>;
  let ownerB: Awaited<ReturnType<typeof register>>;
  let orgA: string;
  let orgB: string;
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    await database.$connect();
    admin = await register("admin");
    ownerA = await register("owner-a");
    ownerB = await register("owner-b");
    await database.user.update({
      where: { id: admin.user.id },
      data: { platformRole: "PLATFORM_ADMIN" },
    });
    orgA = await organization(ownerA.cookie, "CatalogA", true);
    orgB = await organization(ownerB.cookie, "CatalogB", false);
    const suffix = randomUUID().slice(0, 8);
    const category = await createCategory(
      apiRequest(
        "/api/v1/admin/categories",
        { name: `Pilot Kategori ${suffix}`, slug: `pilot-kategori-${suffix}` },
        admin.cookie,
      ),
    );
    categoryId = (await category.json()).data.id;
    const brand = await createBrand(
      apiRequest(
        "/api/v1/admin/brands",
        { name: `Pilot Marka ${suffix}`, slug: `pilot-marka-${suffix}` },
        admin.cookie,
      ),
    );
    brandId = (await brand.json()).data.id;
  }, 30_000);

  afterAll(async () => database.$disconnect());

  it("kategori ve marka yönetimini platform rolüyle sınırlar", async () => {
    await database.user.update({
      where: { id: ownerA.user.id },
      data: { platformRole: "PLATFORM_SUPPORT" },
    });
    const denied = await createCategory(
      apiRequest(
        "/api/v1/admin/categories",
        { name: "Yetkisiz Kategori", slug: `yetkisiz-${randomUUID()}` },
        ownerA.cookie,
      ),
    );
    expect(denied.status).toBe(403);
    await database.user.update({ where: { id: ownerA.user.id }, data: { platformRole: "USER" } });
    await expect(
      database.auditLog.findFirst({
        where: { action: "catalog.category_created", targetId: categoryId },
      }),
    ).resolves.not.toBeNull();
    await expect(
      database.auditLog.findFirst({
        where: { action: "catalog.brand_created", targetId: brandId },
      }),
    ).resolves.not.toBeNull();
  });

  it("ürünü oluşturur/düzenler, başka organizasyon yazımını ve doğrulanmamış yayını engeller", async () => {
    const suffix = randomUUID().slice(0, 8);
    const created = await createProduct(
      apiRequest(
        `/api/v1/organizations/${orgA}/products`,
        productBody(categoryId, brandId, suffix),
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA }) },
    );
    expect(created.status).toBe(201);
    const product = (await created.json()).data as { id: string };
    const edited = await updateProduct(
      apiRequest(
        `/api/v1/organizations/${orgA}/products/${product.id}`,
        productBody(categoryId, brandId, suffix, 13990),
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, productId: product.id }) },
    );
    expect(edited.status).toBe(200);
    const crossWrite = await updateProduct(
      apiRequest(
        `/api/v1/organizations/${orgB}/products/${product.id}`,
        productBody(categoryId, brandId, suffix),
        ownerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgB, productId: product.id }) },
    );
    expect(crossWrite.status).toBe(404);

    const unverifiedSuffix = randomUUID().slice(0, 8);
    const unverifiedCreate = await createProduct(
      apiRequest(
        `/api/v1/organizations/${orgB}/products`,
        productBody(categoryId, brandId, unverifiedSuffix),
        ownerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgB }) },
    );
    const unverifiedProduct = (await unverifiedCreate.json()).data as { id: string };
    const blockedSubmit = await submitProduct(
      apiRequest(
        `/api/v1/organizations/${orgB}/products/${unverifiedProduct.id}/submit`,
        {},
        ownerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgB, productId: unverifiedProduct.id }) },
    );
    expect(blockedSubmit.status).toBe(409);
  });

  it("admin onayı/ret ve public yalnız aktif ürün görünürlüğünü uygular", async () => {
    const suffix = randomUUID().slice(0, 8);
    const body = productBody(categoryId, brandId, suffix);
    const created = await createProduct(
      apiRequest(`/api/v1/organizations/${orgA}/products`, body, ownerA.cookie),
      { params: Promise.resolve({ organizationId: orgA }) },
    );
    const product = (await created.json()).data as { id: string };
    const before = await listPublicProducts();
    expect(JSON.stringify((await before.json()).data)).not.toContain(body.slug);
    expect(
      (
        await submitProduct(
          apiRequest(
            `/api/v1/organizations/${orgA}/products/${product.id}/submit`,
            {},
            ownerA.cookie,
          ),
          { params: Promise.resolve({ organizationId: orgA, productId: product.id }) },
        )
      ).status,
    ).toBe(200);
    const deniedModeration = await moderateProduct(
      apiRequest(
        `/api/v1/admin/products/${product.id}/moderate`,
        { status: "ACTIVE" },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ productId: product.id }) },
    );
    expect(deniedModeration.status).toBe(403);
    const approved = await moderateProduct(
      apiRequest(
        `/api/v1/admin/products/${product.id}/moderate`,
        { status: "ACTIVE" },
        admin.cookie,
      ),
      { params: Promise.resolve({ productId: product.id }) },
    );
    expect(approved.status).toBe(200);
    const listed = await listPublicProducts();
    expect(JSON.stringify((await listed.json()).data)).toContain(body.slug);
    const detail = await getPublicProduct(new Request(`${baseUrl}/api/v1/products/${body.slug}`), {
      params: Promise.resolve({ slug: body.slug }),
    });
    expect(detail.status).toBe(200);

    const rejectedSuffix = randomUUID().slice(0, 8);
    const rejectedCreated = await createProduct(
      apiRequest(
        `/api/v1/organizations/${orgA}/products`,
        productBody(categoryId, brandId, rejectedSuffix),
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA }) },
    );
    const rejectedProduct = (await rejectedCreated.json()).data as { id: string };
    await submitProduct(
      apiRequest(
        `/api/v1/organizations/${orgA}/products/${rejectedProduct.id}/submit`,
        {},
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: orgA, productId: rejectedProduct.id }) },
    );
    const rejected = await moderateProduct(
      apiRequest(
        `/api/v1/admin/products/${rejectedProduct.id}/moderate`,
        { status: "REJECTED", note: "Ürün açıklaması yetersiz." },
        admin.cookie,
      ),
      { params: Promise.resolve({ productId: rejectedProduct.id }) },
    );
    expect(rejected.status).toBe(200);
    await expect(
      database.product.findUniqueOrThrow({ where: { id: rejectedProduct.id } }),
    ).resolves.toMatchObject({ status: "REJECTED" });
    const audit = await database.auditLog.findFirstOrThrow({
      where: { targetId: product.id, action: "catalog.product_moderated" },
    });
    expect(JSON.stringify(audit.afterRedacted)).not.toContain("Ürün açıklaması");
  }, 30_000);
});
