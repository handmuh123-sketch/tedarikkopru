import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as decideSupplierOrder } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/supplier-decision/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Supplier-Decision-2026!";

function request(path: string, method: string, body?: unknown, cookie?: string) {
  return new Request(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      origin: baseUrl,
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 1)}`,
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = `supplier-decision-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Supplier decision ${label}`,
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
  role: "OWNER" | "WAREHOUSE_OPERATOR",
  label: string,
) {
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
      authorizedPerson: "Sipariş Test Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: {
        create: { userId, role, status: "ACTIVE", joinedAt: new Date() },
      },
    },
  });
}

describe("Faz 3B-2 gerçek PostgreSQL tedarikçi sipariş kararı", () => {
  let buyer: Awaited<ReturnType<typeof register>>;
  let supplierWarehouse: Awaited<ReturnType<typeof register>>;
  let foreignSupplier: Awaited<ReturnType<typeof register>>;
  let buyerOrganizationId: string;
  let supplierOrganizationId: string;
  let foreignSupplierOrganizationId: string;
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    await database.$connect();
    [buyer, supplierWarehouse, foreignSupplier] = await Promise.all([
      register("buyer"),
      register("warehouse"),
      register("foreign-supplier"),
    ]);
    const [buyerOrganization, supplierOrganization, foreignSupplierOrganization] =
      await Promise.all([
        organization(buyer.user.id, "RESELLER", "OWNER", "SupplierDecisionBuyer"),
        organization(
          supplierWarehouse.user.id,
          "SUPPLIER",
          "WAREHOUSE_OPERATOR",
          "SupplierDecisionSupplier",
        ),
        organization(
          foreignSupplier.user.id,
          "SUPPLIER",
          "WAREHOUSE_OPERATOR",
          "SupplierDecisionForeign",
        ),
      ]);
    buyerOrganizationId = buyerOrganization.id;
    supplierOrganizationId = supplierOrganization.id;
    foreignSupplierOrganizationId = foreignSupplierOrganization.id;
    const suffix = randomUUID().slice(0, 8);
    const [category, brand] = await Promise.all([
      database.category.create({
        data: {
          name: `Supplier Decision Category ${suffix}`,
          slug: `supplier-decision-category-${suffix}`,
          path: `supplier-decision-category-${suffix}`,
        },
      }),
      database.brand.create({
        data: {
          name: `Supplier Decision Brand ${suffix}`,
          slug: `supplier-decision-brand-${suffix}`,
        },
      }),
    ]);
    categoryId = category.id;
    brandId = brand.id;
  }, 40_000);

  afterAll(async () => database.$disconnect());

  async function paidOrder(label: string) {
    const suffix = randomUUID().slice(0, 8);
    const now = new Date();
    const product = await database.product.create({
      data: {
        supplierOrganizationId,
        categoryId,
        brandId,
        title: `Supplier Decision ${label} ${suffix}`,
        slug: `supplier-decision-${label.toLowerCase()}-${suffix}`,
        shortDescription: "Tedarikçi karar testi ürünü.",
        description: "Tedarikçi kabul ret ve stok bütünlüğü için yeterince uzun test ürünü.",
        status: "ACTIVE",
        publishedAt: now,
        vatRateBasisPoints: 2_000,
      },
    });
    const variant = await database.productVariant.create({
      data: {
        productId: product.id,
        supplierOrganizationId,
        sku: `DEC-${label}-${suffix}`.toUpperCase(),
        title: "Standart",
        moq: 5,
        quantityStep: 5,
        priceAmountMinor: 1_000,
      },
    });
    const inventory = await database.inventory.create({
      data: {
        variantId: variant.id,
        supplierOrganizationId,
        onHand: 5,
        reserved: 0,
      },
    });
    const checkout = await database.checkout.create({
      data: {
        buyerOrganizationId,
        supplierOrganizationId,
        idempotencyKey: `paid-${randomUUID()}`,
        requestHash: randomUUID().replaceAll("-", ""),
        status: "COMPLETED",
        subtotalAmountMinor: 5_000,
        vatAmountMinor: 1_000,
        totalAmountMinor: 6_000,
        deliveryAddressSnapshot: { title: "Test teslimat" },
        invoiceAddressSnapshot: { title: "Test fatura" },
        expiresAt: new Date(now.getTime() + 15 * 60_000),
      },
    });
    const order = await database.order.create({
      data: {
        publicNumber: `TK-DEC-${suffix.toUpperCase()}`,
        checkoutId: checkout.id,
        buyerOrganizationId,
        supplierOrganizationId,
        status: "PAID",
        subtotalAmountMinor: 5_000,
        vatAmountMinor: 1_000,
        totalAmountMinor: 6_000,
        deliveryAddressSnapshot: { title: "Test teslimat" },
        invoiceAddressSnapshot: { title: "Test fatura" },
        items: {
          create: {
            sourceProductId: product.id,
            sourceVariantId: variant.id,
            productTitleSnapshot: product.title,
            variantTitleSnapshot: variant.title,
            skuSnapshot: variant.sku,
            optionValuesSnapshot: {},
            quantity: 5,
            unitPriceAmountMinor: 1_000,
            subtotalAmountMinor: 5_000,
            vatRateBasisPoints: 2_000,
            vatAmountMinor: 1_000,
            totalAmountMinor: 6_000,
          },
        },
      },
    });
    await database.stockReservation.create({
      data: {
        checkoutId: checkout.id,
        inventoryId: inventory.id,
        quantity: 5,
        status: "CONSUMED",
        expiresAt: checkout.expiresAt,
        consumedAt: now,
      },
    });
    await database.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: "SALE",
        quantityDelta: -5,
        balanceAfter: 5,
        safetyStockAfter: 0,
        reservedDelta: -5,
        reservedAfter: 0,
        referenceType: "Order",
        referenceId: order.id,
        reason: "Ödeme sonrası satış",
      },
    });
    await database.orderStatusHistory.createMany({
      data: [
        {
          orderId: order.id,
          fromStatus: null,
          toStatus: "DRAFT",
          reasonCode: "checkout_draft_created",
          actorType: "USER",
          actorId: buyer.user.id,
        },
        {
          orderId: order.id,
          fromStatus: "PAYMENT_PROCESSING",
          toStatus: "PAID",
          reasonCode: "mock_payment_succeeded",
          actorType: "USER",
          actorId: buyer.user.id,
        },
      ],
    });
    return { order, checkout, inventory };
  }

  async function decide(
    organizationId: string,
    orderId: string,
    decision: "ACCEPTED" | "REJECTED",
    cookie: string,
  ) {
    return decideSupplierOrder(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/supplier-decision`,
        "POST",
        { decision },
        cookie,
      ),
      { params: Promise.resolve({ organizationId, orderId }) },
    );
  }

  it("depo operatörü kendi PAID siparişini bir kez kabul eder; BOLA ve zıt karar engellenir", async () => {
    const draft = await paidOrder("Accept");
    expect(
      (
        await decide(
          foreignSupplierOrganizationId,
          draft.order.id,
          "ACCEPTED",
          foreignSupplier.cookie,
        )
      ).status,
    ).toBe(404);
    expect(
      (await decide(buyerOrganizationId, draft.order.id, "ACCEPTED", buyer.cookie)).status,
    ).toBe(404);

    const accepted = await decide(
      supplierOrganizationId,
      draft.order.id,
      "ACCEPTED",
      supplierWarehouse.cookie,
    );
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).data).toMatchObject({ id: draft.order.id, status: "ACCEPTED" });
    expect(
      (await decide(supplierOrganizationId, draft.order.id, "ACCEPTED", supplierWarehouse.cookie))
        .status,
    ).toBe(200);
    expect(
      (await decide(supplierOrganizationId, draft.order.id, "REJECTED", supplierWarehouse.cookie))
        .status,
    ).toBe(409);
    expect(
      await database.orderStatusHistory.count({
        where: { orderId: draft.order.id, toStatus: "ACCEPTED" },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({
        where: { targetId: draft.order.id, action: "order.supplier_accepted" },
      }),
    ).toBe(1);
  });

  it("ret stok ve tüketilmiş rezervasyonu değiştirmeden bir kez kaydedilir", async () => {
    const draft = await paidOrder("Reject");
    expect(
      (await decide(supplierOrganizationId, draft.order.id, "REJECTED", supplierWarehouse.cookie))
        .status,
    ).toBe(200);
    expect(
      (await decide(supplierOrganizationId, draft.order.id, "REJECTED", supplierWarehouse.cookie))
        .status,
    ).toBe(200);
    const [order, reservation, inventory] = await Promise.all([
      database.order.findUniqueOrThrow({ where: { id: draft.order.id } }),
      database.stockReservation.findFirstOrThrow({ where: { checkoutId: draft.checkout.id } }),
      database.inventory.findUniqueOrThrow({ where: { id: draft.inventory.id } }),
    ]);
    expect(order.status).toBe("REJECTED");
    expect(reservation.status).toBe("CONSUMED");
    expect(inventory).toMatchObject({ onHand: 5, reserved: 0 });
    expect(
      await database.inventoryMovement.count({
        where: { inventoryId: inventory.id, type: "SALE", referenceId: order.id },
      }),
    ).toBe(1);
    expect(
      await database.inventoryMovement.count({
        where: { inventoryId: inventory.id, type: "RESERVATION_RELEASE" },
      }),
    ).toBe(0);
    expect(
      await database.orderStatusHistory.count({
        where: { orderId: order.id, toStatus: "REJECTED" },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({
        where: { targetId: order.id, action: "order.supplier_rejected" },
      }),
    ).toBe(1);
  });
});
