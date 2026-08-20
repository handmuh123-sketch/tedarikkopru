import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as offerQuote } from "@/app/api/v1/organizations/[organizationId]/rfqs/[rfqId]/quote/route";
import { POST as decideQuote } from "@/app/api/v1/organizations/[organizationId]/rfqs/[rfqId]/quotes/[quoteId]/decision/route";
import { POST as createRfq } from "@/app/api/v1/organizations/[organizationId]/rfqs/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Rfq-Quote-2026!";
const quoteValidUntil = new Date(Date.now() + 86_400_000).toISOString();

function request(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string,
  idempotencyKey?: string,
) {
  return new Request(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      origin: baseUrl,
      "x-forwarded-for": "198.51.100." + Math.floor(Math.random() * 200 + 1),
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = "rfq-quote-" + label + "-" + randomUUID() + "@example.test";
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: "RFQ quote " + label,
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

async function organization(
  userId: string,
  type: "SUPPLIER" | "RESELLER",
  role: "OWNER" | "CATALOG_MANAGER",
  label: string,
) {
  const suffix = randomUUID();
  return database.organization.create({
    data: {
      type,
      legalName: label + " Limited Şirketi",
      tradeName: label,
      slug: label.toLowerCase() + "-" + suffix,
      taxNumberEncrypted: "test-cipher-" + suffix,
      taxNumberHash: suffix.replaceAll("-", ""),
      taxOffice: "Kadıköy",
      phone: "+90 212 555 0808",
      email: suffix + "@example.test",
      authorizedPerson: "RFQ Test Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: {
        create: { userId, role, status: "ACTIVE", joinedAt: new Date() },
      },
    },
  });
}

describe("Faz 3C gerçek PostgreSQL RFQ ve teklif", () => {
  let buyer: Awaited<ReturnType<typeof register>>;
  let supplier: Awaited<ReturnType<typeof register>>;
  let foreignBuyer: Awaited<ReturnType<typeof register>>;
  let foreignSupplier: Awaited<ReturnType<typeof register>>;
  let buyerOrganizationId: string;
  let supplierOrganizationId: string;
  let foreignBuyerOrganizationId: string;
  let foreignSupplierOrganizationId: string;
  let variantId: string;

  beforeAll(async () => {
    await database.$connect();
    [buyer, supplier, foreignBuyer, foreignSupplier] = await Promise.all([
      register("buyer"),
      register("supplier"),
      register("foreign-buyer"),
      register("foreign-supplier"),
    ]);
    const organizations = await Promise.all([
      organization(buyer.user.id, "RESELLER", "OWNER", "RfqQuoteBuyer"),
      organization(supplier.user.id, "SUPPLIER", "CATALOG_MANAGER", "RfqQuoteSupplier"),
      organization(foreignBuyer.user.id, "RESELLER", "OWNER", "RfqQuoteForeignBuyer"),
      organization(
        foreignSupplier.user.id,
        "SUPPLIER",
        "CATALOG_MANAGER",
        "RfqQuoteForeignSupplier",
      ),
    ]);
    buyerOrganizationId = organizations[0].id;
    supplierOrganizationId = organizations[1].id;
    foreignBuyerOrganizationId = organizations[2].id;
    foreignSupplierOrganizationId = organizations[3].id;

    const suffix = randomUUID().slice(0, 8);
    const category = await database.category.create({
      data: {
        name: "RFQ Quote Category " + suffix,
        slug: "rfq-quote-category-" + suffix,
        path: "rfq-quote-category-" + suffix,
      },
    });
    const brand = await database.brand.create({
      data: {
        name: "RFQ Quote Brand " + suffix,
        slug: "rfq-quote-brand-" + suffix,
      },
    });
    const product = await database.product.create({
      data: {
        supplierOrganizationId,
        categoryId: category.id,
        brandId: brand.id,
        title: "RFQ Quote Product " + suffix,
        slug: "rfq-quote-product-" + suffix,
        shortDescription: "RFQ teklif test ürünü.",
        description: "RFQ teklif ve idempotency bütünlüğü için test ürünü açıklaması.",
        status: "ACTIVE",
        publishedAt: new Date(),
      },
    });
    const variant = await database.productVariant.create({
      data: {
        productId: product.id,
        supplierOrganizationId,
        sku: "RFQ-" + suffix,
        title: "Standart",
        moq: 5,
        quantityStep: 5,
        priceAmountMinor: 12_000,
      },
    });
    variantId = variant.id;
  }, 40_000);

  afterAll(async () => database.$disconnect());

  async function createRequest() {
    const response = await createRfq(
      request(
        "/api/v1/organizations/" + buyerOrganizationId + "/rfqs",
        "POST",
        { variantId, targetQuantity: 10, buyerNote: "Hızlı teslimat mümkün mü?" },
        buyer.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrganizationId }) },
    );
    expect(response.status).toBe(201);
    return (await response.json()).data as { id: string };
  }

  async function offer(
    organizationId: string,
    rfqId: string,
    cookie: string,
    key: string,
    unitPriceAmountMinor = 11_000,
  ) {
    return offerQuote(
      request(
        "/api/v1/organizations/" + organizationId + "/rfqs/" + rfqId + "/quote",
        "POST",
        {
          unitPriceAmountMinor,
          validUntil: quoteValidUntil,
          supplierNote: "Peşin ödeme teklifi.",
        },
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, rfqId }) },
    );
  }

  async function decide(
    organizationId: string,
    rfqId: string,
    quoteId: string,
    cookie: string,
    key: string,
    decision: "ACCEPTED" | "REJECTED",
  ) {
    return decideQuote(
      request(
        "/api/v1/organizations/" +
          organizationId +
          "/rfqs/" +
          rfqId +
          "/quotes/" +
          quoteId +
          "/decision",
        "POST",
        { decision },
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, rfqId, quoteId }) },
    );
  }

  it("teklif verme BOLA korumalıdır ve aynı anahtar ikinci teklif kaydı üretmez", async () => {
    const rfq = await createRequest();
    expect(
      (
        await offer(
          foreignSupplierOrganizationId,
          rfq.id,
          foreignSupplier.cookie,
          "quote-" + randomUUID(),
        )
      ).status,
    ).toBe(404);

    const key = "quote-" + randomUUID();
    const first = await offer(supplierOrganizationId, rfq.id, supplier.cookie, key);
    expect(first.status).toBe(201);
    const quote = (await first.json()).data as { id: string; status: string };
    expect(quote.status).toBe("OFFERED");
    expect((await offer(supplierOrganizationId, rfq.id, supplier.cookie, key)).status).toBe(201);
    expect((await offer(supplierOrganizationId, rfq.id, supplier.cookie, key, 10_500)).status).toBe(
      409,
    );
    expect(
      await database.quoteStatusHistory.count({ where: { quoteId: quote.id, toStatus: "OFFERED" } }),
    ).toBe(1);
    expect(
      await database.rfqStatusHistory.count({
        where: { rfqId: rfq.id, toStatus: "QUOTED", reasonCode: "supplier_quote_offered" },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({ where: { targetId: quote.id, action: "rfq.quote_offered" } }),
    ).toBe(1);
  });

  it("alıcı kabul ve ret kararını BOLA korumalı ve idempotent uygular", async () => {
    const acceptedRfq = await createRequest();
    const offered = await offer(
      supplierOrganizationId,
      acceptedRfq.id,
      supplier.cookie,
      "quote-" + randomUUID(),
    );
    const acceptedQuote = (await offered.json()).data as { id: string };
    const decisionKey = "decision-" + randomUUID();

    expect(
      (
        await decide(
          foreignBuyerOrganizationId,
          acceptedRfq.id,
          acceptedQuote.id,
          foreignBuyer.cookie,
          decisionKey,
          "ACCEPTED",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await decide(
          buyerOrganizationId,
          acceptedRfq.id,
          acceptedQuote.id,
          buyer.cookie,
          decisionKey,
          "ACCEPTED",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await decide(
          buyerOrganizationId,
          acceptedRfq.id,
          acceptedQuote.id,
          buyer.cookie,
          decisionKey,
          "ACCEPTED",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await decide(
          buyerOrganizationId,
          acceptedRfq.id,
          acceptedQuote.id,
          buyer.cookie,
          "decision-" + randomUUID(),
          "REJECTED",
        )
      ).status,
    ).toBe(409);
    expect(
      await database.quoteStatusHistory.count({
        where: { quoteId: acceptedQuote.id, toStatus: "ACCEPTED" },
      }),
    ).toBe(1);
    expect(
      await database.rfqStatusHistory.count({
        where: { rfqId: acceptedRfq.id, toStatus: "ACCEPTED" },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({
        where: { targetId: acceptedQuote.id, action: "rfq.quote_accepted" },
      }),
    ).toBe(1);

    const rejectedRfq = await createRequest();
    const rejectedOffer = await offer(
      supplierOrganizationId,
      rejectedRfq.id,
      supplier.cookie,
      "quote-" + randomUUID(),
    );
    const rejectedQuote = (await rejectedOffer.json()).data as { id: string };
    expect(
      (
        await decide(
          buyerOrganizationId,
          rejectedRfq.id,
          rejectedQuote.id,
          buyer.cookie,
          "decision-" + randomUUID(),
          "REJECTED",
        )
      ).status,
    ).toBe(200);
    expect(
      await database.auditLog.count({
        where: { targetId: rejectedQuote.id, action: "rfq.quote_rejected" },
      }),
    ).toBe(1);
  });
});
