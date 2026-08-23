import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as createConnection } from "@/app/api/v1/organizations/[organizationId]/marketplace-connections/route";
import { PATCH as updateConnection } from "@/app/api/v1/organizations/[organizationId]/marketplace-connections/[connectionId]/route";
import { POST as publishFavorites } from "@/app/api/v1/organizations/[organizationId]/marketplace-connections/[connectionId]/publish-favorites/route";
import { POST as testConnection } from "@/app/api/v1/organizations/[organizationId]/marketplace-connections/[connectionId]/test/route";
import { GET as previewTrendyol } from "@/app/api/v1/marketplace/trendyol/preview/route";
import { POST as receiveWebhook } from "@/app/api/v1/marketplace/webhooks/[channel]/[connectionId]/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Marketplace-Integration-2026!";

function request(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string,
  idempotencyKey?: string,
  headers: Record<string, string> = {},
) {
  return new Request(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      origin: baseUrl,
      "x-forwarded-for": "198.51.100.42",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = `marketplace-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Marketplace ${label}`,
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

async function resellerOrganization(
  userId: string,
  label: string,
  role: "OWNER" | "CATALOG_MANAGER",
) {
  const suffix = randomUUID();
  return database.organization.create({
    data: {
      type: "RESELLER",
      legalName: `${label} Limited Şirketi`,
      tradeName: label,
      slug: `${label.toLowerCase()}-${suffix}`,
      taxNumberEncrypted: `test-cipher-${suffix}`,
      taxNumberHash: suffix.replaceAll("-", ""),
      taxOffice: "Kadıköy",
      phone: "+90 212 555 0808",
      email: `${suffix}@example.test`,
      authorizedPerson: "Marketplace Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: { create: { userId, role, status: "ACTIVE", joinedAt: new Date() } },
    },
  });
}

describe("Faz 7A gerçek PostgreSQL marketplace integration", () => {
  let owner: Awaited<ReturnType<typeof register>>;
  let catalogManager: Awaited<ReturnType<typeof register>>;
  let foreignOwner: Awaited<ReturnType<typeof register>>;
  let organizationId: string;
  let foreignOrganizationId: string;
  let connectionId: string;

  beforeAll(async () => {
    await database.$connect();
    [owner, catalogManager, foreignOwner] = await Promise.all([
      register("owner"),
      register("catalog-manager"),
      register("foreign-owner"),
    ]);
    const [organization, foreign] = await Promise.all([
      resellerOrganization(owner.user.id, "MarketplaceBuyer", "OWNER"),
      resellerOrganization(foreignOwner.user.id, "MarketplaceForeign", "OWNER"),
    ]);
    organizationId = organization.id;
    foreignOrganizationId = foreign.id;
    await database.organizationMembership.create({
      data: {
        organizationId,
        userId: catalogManager.user.id,
        role: "CATALOG_MANAGER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
    const suffix = randomUUID().slice(0, 8);
    const supplier = await database.organization.create({
      data: {
        type: "SUPPLIER",
        legalName: `Marketplace Supplier ${suffix}`,
        tradeName: `Marketplace Supplier ${suffix}`,
        slug: `marketplace-supplier-${suffix}`,
        taxNumberEncrypted: `supplier-cipher-${suffix}`,
        taxNumberHash: `supplier${suffix}`.replaceAll("-", ""),
        taxOffice: "Kadıköy",
        phone: "+90 212 555 0808",
        email: `supplier-${suffix}@example.test`,
        authorizedPerson: "Supplier Yetkilisi",
        status: "ACTIVE",
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
      },
    });
    const category = await database.category.create({
      data: {
        name: `Marketplace Category ${suffix}`,
        slug: `marketplace-category-${suffix}`,
        path: `marketplace-category-${suffix}`,
      },
    });
    const brand = await database.brand.create({
      data: { name: `Marketplace Brand ${suffix}`, slug: `marketplace-brand-${suffix}` },
    });
    const product = await database.product.create({
      data: {
        supplierOrganizationId: supplier.id,
        categoryId: category.id,
        brandId: brand.id,
        title: `Marketplace Cable ${suffix}`,
        slug: `marketplace-cable-${suffix}`,
        shortDescription: "Marketplace preview ürünü.",
        description:
          "Marketplace V2 preview ve idempotency doğrulamasında kullanılan ürün açıklaması.",
        status: "ACTIVE",
        attributes: { renk: "Siyah" },
        publishedAt: new Date(),
      },
    });
    const variant = await database.productVariant.create({
      data: {
        productId: product.id,
        supplierOrganizationId: supplier.id,
        sku: `MKT-${suffix}`,
        barcode: `8680000${suffix.replace(/[^0-9]/g, "") || "123"}`.slice(0, 14),
        title: "Standart",
        priceAmountMinor: 18_990,
        moq: 5,
        quantityStep: 5,
      },
    });
    await Promise.all([
      database.inventory.create({
        data: {
          variantId: variant.id,
          supplierOrganizationId: supplier.id,
          onHand: 30,
          safetyStock: 2,
        },
      }),
      database.productImage.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          storageKey: `https://cdn.example.test/${suffix}.jpg`,
          altText: product.title,
          isPrimary: true,
        },
      }),
      database.productFavorite.create({ data: { userId: owner.user.id, productId: product.id } }),
      database.marketplaceCategoryMapping.create({
        data: {
          channel: "TRENDYOL",
          categoryId: category.id,
          externalCategoryId: "123",
          externalCategoryName: "Kablo",
          attributeMappings: {
            create: {
              sourceAttributeKey: "renk",
              externalAttributeId: "456",
              externalAttributeName: "Renk",
            },
          },
        },
      }),
      database.marketplaceBrandMapping.create({
        data: {
          channel: "TRENDYOL",
          brandId: brand.id,
          externalBrandId: "789",
          externalBrandName: "Marka",
        },
      }),
    ]);
  }, 40_000);

  afterAll(async () => database.$disconnect());

  it("connection credentialını şifreler, response/audit içine secret koymaz ve rol/BOLA koruması uygular", async () => {
    const secret = `api-secret-${randomUUID()}`;
    const created = await createConnection(
      request(
        `/api/v1/organizations/${organizationId}/marketplace-connections`,
        "POST",
        {
          channel: "TRENDYOL",
          displayName: "Pilot Trendyol",
          credentials: {
            sellerId: "123456",
            apiKey: `api-key-${randomUUID()}`,
            apiSecret: secret,
            webhookApiKey: "webhook-test-key",
          },
        },
        owner.cookie,
      ),
      { params: Promise.resolve({ organizationId }) },
    );
    expect(created.status).toBe(201);
    const payload = JSON.stringify(await created.json());
    expect(payload).not.toContain(secret);
    connectionId = (JSON.parse(payload) as { data: { id: string } }).data.id;
    const stored = await database.marketplaceConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });
    expect(stored.credentialCiphertext).not.toContain(secret);
    expect(
      await database.auditLog.findFirst({
        where: { targetId: connectionId, action: "marketplace.connection_created" },
      }),
    ).toMatchObject({ afterRedacted: { credentialsConfigured: true } });

    const rotatedSecret = `rotated-secret-${randomUUID()}`;
    const rotated = await updateConnection(
      request(
        `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}`,
        "PATCH",
        { credentials: { apiSecret: rotatedSecret } },
        owner.cookie,
      ),
      { params: Promise.resolve({ organizationId, connectionId }) },
    );
    expect(rotated.status).toBe(200);
    expect(JSON.stringify(await rotated.json())).not.toContain(rotatedSecret);
    expect(
      (await database.marketplaceConnection.findUniqueOrThrow({ where: { id: connectionId } }))
        .credentialCiphertext,
    ).not.toContain(rotatedSecret);
    const healthCheck = await testConnection(
      request(
        `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/test`,
        "POST",
        undefined,
        owner.cookie,
      ),
      { params: Promise.resolve({ organizationId, connectionId }) },
    );
    expect(healthCheck.status).toBe(200);
    expect((await healthCheck.json()).data).toMatchObject({ mode: "PREVIEW", valid: true });

    const unauthorized = await createConnection(
      request(
        `/api/v1/organizations/${organizationId}/marketplace-connections`,
        "POST",
        { channel: "HEPSIBURADA" },
        catalogManager.cookie,
      ),
      { params: Promise.resolve({ organizationId }) },
    );
    expect(unauthorized.status).toBe(404);
    const crossOrg = await updateConnection(
      request(
        `/api/v1/organizations/${foreignOrganizationId}/marketplace-connections/${connectionId}`,
        "PATCH",
        { displayName: "Yetkisiz" },
        foreignOwner.cookie,
      ),
      { params: Promise.resolve({ organizationId: foreignOrganizationId, connectionId }) },
    );
    expect(crossOrg.status).toBe(404);
  }, 40_000);

  it("favorilerden Trendyol preview üretir ve aynı publish idempotency key ikinci job oluşturmaz", async () => {
    const preview = await previewTrendyol(
      request("/api/v1/marketplace/trendyol/preview", "GET", undefined, owner.cookie),
    );
    expect(preview.status).toBe(200);
    expect((await preview.json()).data.validation).toMatchObject({
      validCount: 1,
      invalidCount: 0,
    });
    const foreignPreview = await previewTrendyol(
      request("/api/v1/marketplace/trendyol/preview", "GET", undefined, foreignOwner.cookie),
    );
    expect(foreignPreview.status).toBe(200);
    expect((await foreignPreview.json()).data.validation).toMatchObject({ validCount: 0 });
    const key = `publish-${randomUUID()}`;
    const first = await publishFavorites(
      request(
        `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/publish-favorites`,
        "POST",
        undefined,
        owner.cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, connectionId }) },
    );
    expect(first.status).toBe(200);
    const firstPayload = (await first.json()).data as {
      job: { id: string; status: string; providerRequestId: string };
    };
    expect(firstPayload.job.status).toBe("PREVIEW");
    expect(firstPayload.job.providerRequestId).toMatch(/^MOCK-/);
    const repeated = await publishFavorites(
      request(
        `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/publish-favorites`,
        "POST",
        undefined,
        owner.cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, connectionId }) },
    );
    expect(repeated.status).toBe(200);
    expect((await repeated.json()).data.reused).toBe(true);
    expect(
      await database.marketplaceSyncJob.count({
        where: { organizationId, connectionId, idempotencyKey: key },
      }),
    ).toBe(1);
  }, 40_000);

  it("geçersiz imzayı reddeder, webhook duplicate isteğini idempotent işler", async () => {
    const path = `/api/v1/marketplace/webhooks/TRENDYOL/${connectionId}`;
    const body = JSON.stringify({ event: "TEST", externalReference: "not-persisted" });
    const invalid = await receiveWebhook(
      new Request(baseUrl + path, { method: "POST", headers: { "x-api-key": "wrong" }, body }),
      { params: Promise.resolve({ channel: "TRENDYOL", connectionId }) },
    );
    expect(invalid.status).toBe(401);
    const first = await receiveWebhook(
      new Request(baseUrl + path, {
        method: "POST",
        headers: { "x-api-key": "webhook-test-key", "x-trendyol-event-id": "event-1" },
        body,
      }),
      { params: Promise.resolve({ channel: "TRENDYOL", connectionId }) },
    );
    expect(first.status).toBe(200);
    const duplicate = await receiveWebhook(
      new Request(baseUrl + path, {
        method: "POST",
        headers: { "x-api-key": "webhook-test-key", "x-trendyol-event-id": "event-1" },
        body,
      }),
      { params: Promise.resolve({ channel: "TRENDYOL", connectionId }) },
    );
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()).data.duplicate).toBe(true);
    expect(await database.webhookInbox.count({ where: { connectionId } })).toBe(2);
    const stored = await database.webhookInbox.findFirstOrThrow({
      where: { connectionId, signatureValid: true },
    });
    expect(JSON.stringify(stored.safePayload)).not.toContain("not-persisted");
  }, 40_000);
});
