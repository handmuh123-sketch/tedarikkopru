import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as offerQuote } from "@/app/api/v1/organizations/[organizationId]/rfqs/[rfqId]/quote/route";
import { POST as decideQuote } from "@/app/api/v1/organizations/[organizationId]/rfqs/[rfqId]/quotes/[quoteId]/decision/route";
import { POST as addQuoteToCart } from "@/app/api/v1/organizations/[organizationId]/rfqs/[rfqId]/quotes/[quoteId]/cart/route";
import { POST as createRfq } from "@/app/api/v1/organizations/[organizationId]/rfqs/route";
import { POST as createCheckout } from "@/app/api/v1/organizations/[organizationId]/checkout/route";
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
  let deliveryAddressId: string;
  let invoiceAddressId: string;

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
    await database.inventory.create({
      data: {
        variantId: variant.id,
        supplierOrganizationId,
        onHand: 100,
        safetyStock: 0,
      },
    });
    const [deliveryAddress, invoiceAddress] = await Promise.all([
      database.address.create({
        data: {
          organizationId: buyerOrganizationId,
          type: "WAREHOUSE",
          title: "RFQ Teslimat",
          contactName: "Test Yetkilisi",
          phone: "+90 212 555 0808",
          city: "İstanbul",
          district: "Kadıköy",
          line1: "Test teslimat adresi",
        },
      }),
      database.address.create({
        data: {
          organizationId: buyerOrganizationId,
          type: "BILLING",
          title: "RFQ Fatura",
          contactName: "Test Yetkilisi",
          phone: "+90 212 555 0808",
          city: "İstanbul",
          district: "Kadıköy",
          line1: "Test fatura adresi",
        },
      }),
    ]);
    deliveryAddressId = deliveryAddress.id;
    invoiceAddressId = invoiceAddress.id;
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
      await database.quoteStatusHistory.count({
        where: { quoteId: quote.id, toStatus: "OFFERED" },
      }),
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

  it("kabul edilen teklif fiyatını BOLA korumalı biçimde sepete ve checkout'a taşır", async () => {
    const rfq = await createRequest();
    const offered = await offer(
      supplierOrganizationId,
      rfq.id,
      supplier.cookie,
      "quote-" + randomUUID(),
    );
    const quote = (await offered.json()).data as { id: string };
    expect(
      (
        await decide(
          buyerOrganizationId,
          rfq.id,
          quote.id,
          buyer.cookie,
          "decision-" + randomUUID(),
          "ACCEPTED",
        )
      ).status,
    ).toBe(200);

    const foreignCartResponse = await addQuoteToCart(
      request(
        "/api/v1/organizations/" +
          foreignBuyerOrganizationId +
          "/rfqs/" +
          rfq.id +
          "/quotes/" +
          quote.id +
          "/cart",
        "POST",
        undefined,
        foreignBuyer.cookie,
      ),
      {
        params: Promise.resolve({
          organizationId: foreignBuyerOrganizationId,
          rfqId: rfq.id,
          quoteId: quote.id,
        }),
      },
    );
    expect(foreignCartResponse.status).toBe(404);

    const ownCartRequest = () =>
      request(
        "/api/v1/organizations/" +
          buyerOrganizationId +
          "/rfqs/" +
          rfq.id +
          "/quotes/" +
          quote.id +
          "/cart",
        "POST",
        undefined,
        buyer.cookie,
      );
    expect(
      (
        await addQuoteToCart(ownCartRequest(), {
          params: Promise.resolve({
            organizationId: buyerOrganizationId,
            rfqId: rfq.id,
            quoteId: quote.id,
          }),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await addQuoteToCart(ownCartRequest(), {
          params: Promise.resolve({
            organizationId: buyerOrganizationId,
            rfqId: rfq.id,
            quoteId: quote.id,
          }),
        })
      ).status,
    ).toBe(201);
    const cartItem = await database.cartItem.findFirstOrThrow({
      where: { cart: { buyerOrganizationId }, quoteId: quote.id },
    });
    expect(cartItem.quantity).toBe(10);
    expect(cartItem.quotedUnitPriceMinor).toBe(11_000);

    await database.productVariant.update({
      where: { id: variantId },
      data: { priceAmountMinor: 30_000 },
    });
    const checkout = await createCheckout(
      request(
        "/api/v1/organizations/" + buyerOrganizationId + "/checkout",
        "POST",
        { deliveryAddressId, invoiceAddressId },
        buyer.cookie,
        "checkout-" + randomUUID(),
      ),
      { params: Promise.resolve({ organizationId: buyerOrganizationId }) },
    );
    expect(checkout.status).toBe(201);
    const payload = (await checkout.json()).data as { order: { id: string } };
    const orderItem = await database.orderItem.findFirstOrThrow({
      where: { orderId: payload.order.id },
    });
    expect(orderItem.unitPriceAmountMinor).toBe(11_000);
    expect(
      await database.auditLog.count({
        where: { targetId: quote.id, action: "rfq.quote_added_to_cart" },
      }),
    ).toBe(1);
  });
});
