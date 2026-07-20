import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as addToCart } from "@/app/api/v1/organizations/[organizationId]/cart/route";
import { POST as createCheckout } from "@/app/api/v1/organizations/[organizationId]/checkout/route";
import { POST as completePayment } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/payments/complete/route";
import { POST as startPayment } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/payments/mock/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { releaseExpiredReservations } from "@/modules/orders/application/order-service";

const baseUrl = "http://127.0.0.1:3000";
const password = "Payment-Integration-2026!";

function request(path: string, method: string, body?: unknown, cookie?: string, key?: string) {
  return new Request(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      origin: baseUrl,
      "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 200 + 1)}`,
      ...(cookie ? { cookie } : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = `payment-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Payment ${label}`,
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

async function organization(userId: string, type: "SUPPLIER" | "RESELLER", label: string) {
  const suffix = randomUUID();
  return database.organization.create({
    data: {
      type,
      legalName: `${label} Limited Şirketi`,
      tradeName: label,
      slug: `${label.toLowerCase()}-${suffix}`,
      taxNumberEncrypted: `test-cipher-${suffix}`,
      taxNumberHash: suffix.replaceAll("-", ""),
      taxOffice: "Kadıköy",
      phone: "+90 212 555 0808",
      email: `${suffix}@example.test`,
      authorizedPerson: "Ödeme Test Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: {
        create: { userId, role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
      },
    },
  });
}

async function addresses(organizationId: string) {
  const delivery = await database.address.create({
    data: {
      organizationId,
      type: "WAREHOUSE",
      title: "Ödeme Teslimat",
      contactName: "Test Alıcı",
      phone: "+90 212 555 0808",
      city: "İstanbul",
      district: "Kadıköy",
      line1: "Ödeme Sokak No: 1",
    },
  });
  const invoice = await database.address.create({
    data: {
      organizationId,
      type: "BILLING",
      title: "Ödeme Fatura",
      contactName: "Test Alıcı",
      phone: "+90 212 555 0808",
      city: "İstanbul",
      district: "Kadıköy",
      line1: "Ödeme Sokak No: 2",
    },
  });
  return { delivery, invoice };
}

describe("Faz 3B-1 gerçek PostgreSQL mock ödeme ve alıcı siparişi", () => {
  let buyerA: Awaited<ReturnType<typeof register>>;
  let buyerB: Awaited<ReturnType<typeof register>>;
  let supplier: Awaited<ReturnType<typeof register>>;
  let buyerOrgA: Awaited<ReturnType<typeof organization>>;
  let buyerOrgB: Awaited<ReturnType<typeof organization>>;
  let supplierOrg: Awaited<ReturnType<typeof organization>>;
  let buyerAddressesA: Awaited<ReturnType<typeof addresses>>;
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    await database.$connect();
    [buyerA, buyerB, supplier] = await Promise.all([
      register("buyer-a"),
      register("buyer-b"),
      register("supplier"),
    ]);
    buyerOrgA = await organization(buyerA.user.id, "RESELLER", "PaymentBuyerA");
    buyerOrgB = await organization(buyerB.user.id, "RESELLER", "PaymentBuyerB");
    supplierOrg = await organization(supplier.user.id, "SUPPLIER", "PaymentSupplier");
    buyerAddressesA = await addresses(buyerOrgA.id);
    const suffix = randomUUID().slice(0, 8);
    const [category, brand] = await Promise.all([
      database.category.create({
        data: {
          name: `Payment Category ${suffix}`,
          slug: `payment-category-${suffix}`,
          path: `payment-category-${suffix}`,
        },
      }),
      database.brand.create({
        data: { name: `Payment Brand ${suffix}`, slug: `payment-brand-${suffix}` },
      }),
    ]);
    categoryId = category.id;
    brandId = brand.id;
  }, 40_000);

  afterAll(async () => database.$disconnect());

  async function draftOrder(label: string) {
    const suffix = randomUUID().slice(0, 8);
    const product = await database.product.create({
      data: {
        supplierOrganizationId: supplierOrg.id,
        categoryId,
        brandId,
        title: `Mock Payment ${label} ${suffix}`,
        slug: `mock-payment-${label.toLowerCase()}-${suffix}`,
        shortDescription: "Mock ödeme entegrasyon ürünü.",
        description:
          "Mock ödeme, idempotency ve stok dönüşümü için yeterince uzun test açıklaması.",
        status: "ACTIVE",
        publishedAt: new Date(),
        vatRateBasisPoints: 2_000,
      },
    });
    const variant = await database.productVariant.create({
      data: {
        productId: product.id,
        supplierOrganizationId: supplierOrg.id,
        sku: `PAY-${label}-${suffix}`.toUpperCase(),
        title: "Standart",
        moq: 5,
        quantityStep: 5,
        priceAmountMinor: 1_000,
      },
    });
    const inventory = await database.inventory.create({
      data: { variantId: variant.id, supplierOrganizationId: supplierOrg.id, onHand: 10 },
    });
    const cartResponse = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variant.id, quantity: 5 },
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(cartResponse.status).toBe(201);
    const checkoutResponse = await createCheckout(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/checkout`,
        "POST",
        {
          deliveryAddressId: buyerAddressesA.delivery.id,
          invoiceAddressId: buyerAddressesA.invoice.id,
        },
        buyerA.cookie,
        `checkout-${randomUUID()}`,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(checkoutResponse.status).toBe(201);
    const checkout = (await checkoutResponse.json()).data as {
      id: string;
      order: { id: string; publicNumber: string };
    };
    return { checkout, product, variant, inventory };
  }

  async function start(
    orderId: string,
    key: string,
    cookie = buyerA.cookie,
    organizationId = buyerOrgA.id,
  ) {
    return startPayment(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/payments/mock`,
        "POST",
        undefined,
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId }) },
    );
  }

  async function complete(
    orderId: string,
    paymentId: string,
    outcome: "SUCCEEDED" | "DECLINED" | "CANCELLED",
    key: string,
    cookie = buyerA.cookie,
    organizationId = buyerOrgA.id,
  ) {
    return completePayment(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/payments/complete`,
        "POST",
        { paymentId, outcome },
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId }) },
    );
  }

  it("org scope ve start/complete idempotency ile tek Order/Payment/Attempt üretir", async () => {
    const draft = await draftOrder("Success");
    const foreignStart = await start(
      draft.checkout.order.id,
      `foreign-${randomUUID()}`,
      buyerB.cookie,
      buyerOrgA.id,
    );
    expect(foreignStart.status).toBe(404);

    const startKey = `payment-start-${randomUUID()}`;
    const started = await start(draft.checkout.order.id, startKey);
    expect(started.status).toBe(201);
    const payment = (await started.json()).data as { id: string; status: string };
    expect(payment.status).toBe("PENDING");
    const replay = await start(draft.checkout.order.id, startKey);
    expect(replay.status).toBe(201);
    expect(((await replay.json()).data as { id: string }).id).toBe(payment.id);
    expect((await start(draft.checkout.order.id, `second-${randomUUID()}`)).status).toBe(409);

    const foreignComplete = await complete(
      draft.checkout.order.id,
      payment.id,
      "SUCCEEDED",
      `foreign-complete-${randomUUID()}`,
      buyerB.cookie,
      buyerOrgB.id,
    );
    expect(foreignComplete.status).toBe(404);

    const completionKey = `payment-complete-${randomUUID()}`;
    const completed = await complete(
      draft.checkout.order.id,
      payment.id,
      "SUCCEEDED",
      completionKey,
    );
    expect(completed.status).toBe(200);
    const completedData = (await completed.json()).data as {
      status: string;
      order: { status: string };
    };
    expect(completedData).toMatchObject({ status: "SUCCEEDED", order: { status: "PAID" } });
    expect(
      (await complete(draft.checkout.order.id, payment.id, "SUCCEEDED", completionKey)).status,
    ).toBe(200);
    expect(
      (await complete(draft.checkout.order.id, payment.id, "DECLINED", completionKey)).status,
    ).toBe(409);
    expect(
      (await complete(draft.checkout.order.id, payment.id, "SUCCEEDED", `late-${randomUUID()}`))
        .status,
    ).toBe(409);

    const [order, checkout, inventory, reservation] = await Promise.all([
      database.order.findUniqueOrThrow({
        where: { id: draft.checkout.order.id },
        include: { statusHistory: true },
      }),
      database.checkout.findUniqueOrThrow({ where: { id: draft.checkout.id } }),
      database.inventory.findUniqueOrThrow({ where: { id: draft.inventory.id } }),
      database.stockReservation.findFirstOrThrow({ where: { checkoutId: draft.checkout.id } }),
    ]);
    expect(order.status).toBe("PAID");
    expect(checkout.status).toBe("COMPLETED");
    expect(reservation.status).toBe("CONSUMED");
    expect(inventory).toMatchObject({ onHand: 5, reserved: 0 });
    expect(await database.order.count({ where: { checkoutId: draft.checkout.id } })).toBe(1);
    expect(await database.payment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await database.paymentAttempt.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(
      await database.inventoryMovement.count({ where: { type: "SALE", referenceId: order.id } }),
    ).toBe(1);
    expect(order.statusHistory.map((entry) => entry.toStatus)).toEqual([
      "DRAFT",
      "PAYMENT_PROCESSING",
      "PAID",
    ]);
    expect(
      await database.auditLog.findFirst({
        where: { action: "payment.mock_succeeded", targetId: payment.id },
      }),
    ).not.toBeNull();

    const attempt = await database.paymentAttempt.findFirstOrThrow({
      where: { paymentId: payment.id },
    });
    await expect(database.paymentAttempt.delete({ where: { id: attempt.id } })).rejects.toThrow();
    await expect(
      database.orderStatusHistory.update({
        where: { id: order.statusHistory[0]!.id },
        data: { reasonCode: "changed" },
      }),
    ).rejects.toThrow();
    const item = await database.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    await expect(
      database.orderItem.update({ where: { id: item.id }, data: { quantity: 10 } }),
    ).rejects.toThrow();
  });

  it("DECLINED ve CANCELLED sonuçlarında rezervasyonu tek kez bırakır, stoğu düşmez", async () => {
    for (const outcome of ["DECLINED", "CANCELLED"] as const) {
      const draft = await draftOrder(outcome);
      const started = await start(draft.checkout.order.id, `start-${randomUUID()}`);
      const payment = (await started.json()).data as { id: string };
      const key = `complete-${randomUUID()}`;
      const result = await complete(draft.checkout.order.id, payment.id, outcome, key);
      expect(result.status).toBe(200);
      expect((await complete(draft.checkout.order.id, payment.id, outcome, key)).status).toBe(200);
      const [storedPayment, order, inventory, reservation] = await Promise.all([
        database.payment.findUniqueOrThrow({ where: { id: payment.id } }),
        database.order.findUniqueOrThrow({ where: { id: draft.checkout.order.id } }),
        database.inventory.findUniqueOrThrow({ where: { id: draft.inventory.id } }),
        database.stockReservation.findFirstOrThrow({ where: { checkoutId: draft.checkout.id } }),
      ]);
      expect(storedPayment.status).toBe(outcome === "DECLINED" ? "FAILED" : "CANCELLED");
      expect(order.status).toBe("CANCELLED");
      expect(reservation.status).toBe("RELEASED");
      expect(inventory).toMatchObject({ onHand: 10, reserved: 0 });
      expect(
        await database.inventoryMovement.count({
          where: { type: "RESERVATION_RELEASE", referenceId: draft.checkout.id },
        }),
      ).toBe(1);
      expect(
        await database.inventoryMovement.count({ where: { type: "SALE", referenceId: order.id } }),
      ).toBe(0);
    }
  });

  it("PENDING ödemeyi süre sonuna kadar korur, timeout'ta idempotent release eder", async () => {
    const draft = await draftOrder("Timeout");
    const started = await start(draft.checkout.order.id, `start-${randomUUID()}`);
    const payment = (await started.json()).data as { id: string };
    expect(
      (await database.inventory.findUniqueOrThrow({ where: { id: draft.inventory.id } })).reserved,
    ).toBe(5);
    const now = new Date();
    await database.checkout.update({
      where: { id: draft.checkout.id },
      data: { expiresAt: new Date(now.getTime() - 1_000) },
    });
    expect(await releaseExpiredReservations(now)).toBeGreaterThanOrEqual(1);
    expect((await database.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "EXPIRED",
    );
    expect(
      (await database.order.findUniqueOrThrow({ where: { id: draft.checkout.order.id } })).status,
    ).toBe("CANCELLED");
    expect(await releaseExpiredReservations(new Date(now.getTime() + 1_000))).toBe(0);
    const inventory = await database.inventory.findUniqueOrThrow({
      where: { id: draft.inventory.id },
    });
    expect(inventory).toMatchObject({ onHand: 10, reserved: 0 });
    expect(
      await database.inventoryMovement.count({
        where: { type: "RESERVATION_RELEASE", referenceId: draft.checkout.id },
      }),
    ).toBe(1);
  });
});
