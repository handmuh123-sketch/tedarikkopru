import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as createReturn } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/returns/route";
import { POST as decideReturn } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/returns/[returnId]/decision/route";
import { POST as receiveReturn } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/returns/[returnId]/receive/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Return-Refund-2026!";

function request(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string,
  idempotencyKey?: string,
) {
  return new Request(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      origin: baseUrl,
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 1)}`,
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = `return-refund-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Return refund ${label}`,
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
      authorizedPerson: "İade Test Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: { create: { userId, role, status: "ACTIVE", joinedAt: new Date() } },
    },
  });
}

describe("Faz 4B gerçek PostgreSQL iade ve refund", () => {
  let buyer: Awaited<ReturnType<typeof register>>;
  let foreignBuyer: Awaited<ReturnType<typeof register>>;
  let supplierWarehouse: Awaited<ReturnType<typeof register>>;
  let foreignSupplier: Awaited<ReturnType<typeof register>>;
  let buyerOrganizationId: string;
  let foreignBuyerOrganizationId: string;
  let supplierOrganizationId: string;
  let foreignSupplierOrganizationId: string;
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    await database.$connect();
    [buyer, foreignBuyer, supplierWarehouse, foreignSupplier] = await Promise.all([
      register("buyer"),
      register("foreign-buyer"),
      register("warehouse"),
      register("foreign-supplier"),
    ]);
    const organizations = await Promise.all([
      organization(buyer.user.id, "RESELLER", "OWNER", "ReturnRefundBuyer"),
      organization(foreignBuyer.user.id, "RESELLER", "OWNER", "ReturnRefundForeignBuyer"),
      organization(
        supplierWarehouse.user.id,
        "SUPPLIER",
        "WAREHOUSE_OPERATOR",
        "ReturnRefundSupplier",
      ),
      organization(
        foreignSupplier.user.id,
        "SUPPLIER",
        "WAREHOUSE_OPERATOR",
        "ReturnRefundForeignSupplier",
      ),
    ]);
    buyerOrganizationId = organizations[0].id;
    foreignBuyerOrganizationId = organizations[1].id;
    supplierOrganizationId = organizations[2].id;
    foreignSupplierOrganizationId = organizations[3].id;
    const suffix = randomUUID().slice(0, 8);
    const [category, brand] = await Promise.all([
      database.category.create({
        data: {
          name: `Return Refund Category ${suffix}`,
          slug: `return-refund-category-${suffix}`,
          path: `return-refund-category-${suffix}`,
        },
      }),
      database.brand.create({
        data: { name: `Return Refund Brand ${suffix}`, slug: `return-refund-brand-${suffix}` },
      }),
    ]);
    categoryId = category.id;
    brandId = brand.id;
  }, 40_000);

  afterAll(async () => database.$disconnect());

  async function deliveredOrder(label: string, status: "DELIVERED" | "SHIPPED" = "DELIVERED") {
    const suffix = randomUUID().slice(0, 8);
    const now = new Date();
    const product = await database.product.create({
      data: {
        supplierOrganizationId,
        categoryId,
        brandId,
        title: `Return Refund ${label} ${suffix}`,
        slug: `return-refund-${label.toLowerCase()}-${suffix}`,
        shortDescription: "İade refund test ürünü.",
        description: "İade, refund ve stok geri koyma bütünlüğü için yeterince uzun test ürünü.",
        status: "ACTIVE",
        publishedAt: now,
        vatRateBasisPoints: 2_000,
      },
    });
    const variant = await database.productVariant.create({
      data: {
        productId: product.id,
        supplierOrganizationId,
        sku: `RET-${label}-${suffix}`.toUpperCase(),
        title: "Standart",
        moq: 5,
        quantityStep: 5,
        priceAmountMinor: 1_000,
      },
    });
    const inventory = await database.inventory.create({
      data: { variantId: variant.id, supplierOrganizationId, onHand: 5, reserved: 0 },
    });
    const checkout = await database.checkout.create({
      data: {
        buyerOrganizationId,
        supplierOrganizationId,
        idempotencyKey: `return-paid-${randomUUID()}`,
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
        publicNumber: `TK-RET-${suffix.toUpperCase()}`,
        checkoutId: checkout.id,
        buyerOrganizationId,
        supplierOrganizationId,
        status,
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
      include: { items: true },
    });
    await database.payment.create({
      data: {
        orderId: order.id,
        checkoutId: checkout.id,
        buyerOrganizationId,
        mockReference: `RET-${randomUUID()}`,
        status: "SUCCEEDED",
        amountMinor: 6_000,
        initiationIdempotencyKey: `payment-${randomUUID()}`,
        initiationRequestHash: randomUUID().replaceAll("-", ""),
        initiatedByUserId: buyer.user.id,
        paidAt: now,
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
    return { inventory, order, orderItem: order.items[0]! };
  }

  async function openReturn(
    organizationId: string,
    orderId: string,
    orderItemId: string,
    cookie: string,
    key: string,
    quantity = 2,
  ) {
    return createReturn(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/returns`,
        "POST",
        {
          reason: "DEFECTIVE",
          buyerNote: "İade edilen ürün arızalı.",
          items: [{ orderItemId, quantity }],
        },
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId }) },
    );
  }

  async function decide(
    organizationId: string,
    orderId: string,
    returnId: string,
    cookie: string,
    key: string,
    decision: "ACCEPTED" | "REJECTED",
  ) {
    return decideReturn(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/returns/${returnId}/decision`,
        "POST",
        { decision },
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId, returnId }) },
    );
  }

  async function receive(
    organizationId: string,
    orderId: string,
    returnId: string,
    cookie: string,
    key: string,
  ) {
    return receiveReturn(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/returns/${returnId}/receive`,
        "POST",
        {},
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId, returnId }) },
    );
  }

  it("alıcı kendi teslim edilmiş siparişi için iade açar; kabul refundu ve teslim alma stoku bir kez yazar", async () => {
    const draft = await deliveredOrder("Accepted");
    const createKey = `return-create-${randomUUID()}`;
    const decisionKey = `return-decision-${randomUUID()}`;
    const receiptKey = `return-receipt-${randomUUID()}`;

    expect(
      (
        await openReturn(
          foreignBuyerOrganizationId,
          draft.order.id,
          draft.orderItem.id,
          foreignBuyer.cookie,
          `foreign-buyer-${randomUUID()}`,
        )
      ).status,
    ).toBe(404);
    const opened = await openReturn(
      buyerOrganizationId,
      draft.order.id,
      draft.orderItem.id,
      buyer.cookie,
      createKey,
    );
    expect(opened.status).toBe(201);
    const returnRequest = (await opened.json()).data as { id: string; status: string };
    expect(returnRequest.status).toBe("REQUESTED");
    expect(
      (
        await openReturn(
          buyerOrganizationId,
          draft.order.id,
          draft.orderItem.id,
          buyer.cookie,
          createKey,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await openReturn(
          buyerOrganizationId,
          draft.order.id,
          draft.orderItem.id,
          buyer.cookie,
          createKey,
          3,
        )
      ).status,
    ).toBe(409);

    expect(
      (
        await decide(
          foreignSupplierOrganizationId,
          draft.order.id,
          returnRequest.id,
          foreignSupplier.cookie,
          `foreign-supplier-${randomUUID()}`,
          "ACCEPTED",
        )
      ).status,
    ).toBe(404);
    const accepted = await decide(
      supplierOrganizationId,
      draft.order.id,
      returnRequest.id,
      supplierWarehouse.cookie,
      decisionKey,
      "ACCEPTED",
    );
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).data).toMatchObject({
      id: returnRequest.id,
      status: "ACCEPTED",
    });
    expect(
      (
        await decide(
          supplierOrganizationId,
          draft.order.id,
          returnRequest.id,
          supplierWarehouse.cookie,
          decisionKey,
          "ACCEPTED",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await decide(
          supplierOrganizationId,
          draft.order.id,
          returnRequest.id,
          supplierWarehouse.cookie,
          `opposite-${randomUUID()}`,
          "REJECTED",
        )
      ).status,
    ).toBe(409);

    const beforeReceipt = await database.inventory.findUniqueOrThrow({
      where: { id: draft.inventory.id },
    });
    expect(beforeReceipt).toMatchObject({ onHand: 5, reserved: 0 });
    const refund = await database.refund.findUniqueOrThrow({
      where: { returnRequestId: returnRequest.id },
      include: { items: true },
    });
    expect(refund).toMatchObject({ status: "RECORDED", amountMinor: 2_400 });
    expect(refund.items).toEqual([
      expect.objectContaining({ orderItemId: draft.orderItem.id, quantity: 2, amountMinor: 2_400 }),
    ]);
    expect(
      await database.inventoryMovement.count({
        where: { inventoryId: draft.inventory.id, type: "RETURN_RESTORE" },
      }),
    ).toBe(0);

    expect(
      (
        await receive(
          foreignSupplierOrganizationId,
          draft.order.id,
          returnRequest.id,
          foreignSupplier.cookie,
          `foreign-receipt-${randomUUID()}`,
        )
      ).status,
    ).toBe(404);
    const received = await receive(
      supplierOrganizationId,
      draft.order.id,
      returnRequest.id,
      supplierWarehouse.cookie,
      receiptKey,
    );
    expect(received.status).toBe(200);
    expect((await received.json()).data).toMatchObject({ status: "RETURN_RECEIVED" });
    expect(
      (
        await receive(
          supplierOrganizationId,
          draft.order.id,
          returnRequest.id,
          supplierWarehouse.cookie,
          receiptKey,
        )
      ).status,
    ).toBe(200);

    const [inventory, restoreMovementCount, historyCount, refundCount] = await Promise.all([
      database.inventory.findUniqueOrThrow({ where: { id: draft.inventory.id } }),
      database.inventoryMovement.count({
        where: {
          inventoryId: draft.inventory.id,
          type: "RETURN_RESTORE",
          referenceId: returnRequest.id,
        },
      }),
      database.returnStatusHistory.count({ where: { returnRequestId: returnRequest.id } }),
      database.refund.count({ where: { returnRequestId: returnRequest.id } }),
    ]);
    expect(inventory).toMatchObject({ onHand: 7, reserved: 0 });
    expect(restoreMovementCount).toBe(1);
    expect(historyCount).toBe(3);
    expect(refundCount).toBe(1);
    expect(
      await database.inventoryMovement.count({
        where: { inventoryId: draft.inventory.id, type: "SALE", referenceId: draft.order.id },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({
        where: { targetId: returnRequest.id, action: "return.requested" },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({
        where: { targetId: returnRequest.id, action: "return.accepted" },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({
        where: { targetId: returnRequest.id, action: "return.received" },
      }),
    ).toBe(1);
  });

  it("ret iade için refund veya stok artışı oluşturmaz; teslim edilmemiş sipariş reddedilir", async () => {
    const draft = await deliveredOrder("Rejected");
    const opened = await openReturn(
      buyerOrganizationId,
      draft.order.id,
      draft.orderItem.id,
      buyer.cookie,
      `rejected-create-${randomUUID()}`,
    );
    expect(opened.status).toBe(201);
    const returnRequest = (await opened.json()).data as { id: string };
    const rejected = await decide(
      supplierOrganizationId,
      draft.order.id,
      returnRequest.id,
      supplierWarehouse.cookie,
      `rejected-decision-${randomUUID()}`,
      "REJECTED",
    );
    expect(rejected.status).toBe(200);
    expect(await database.refund.count({ where: { returnRequestId: returnRequest.id } })).toBe(0);
    expect(
      await database.inventoryMovement.count({
        where: {
          inventoryId: draft.inventory.id,
          type: "RETURN_RESTORE",
          referenceId: returnRequest.id,
        },
      }),
    ).toBe(0);

    const notDelivered = await deliveredOrder("NotDelivered", "SHIPPED");
    expect(
      (
        await openReturn(
          buyerOrganizationId,
          notDelivered.order.id,
          notDelivered.orderItem.id,
          buyer.cookie,
          `not-delivered-${randomUUID()}`,
        )
      ).status,
    ).toBe(409);
    expect(await database.returnRequest.count({ where: { orderId: notDelivered.order.id } })).toBe(
      0,
    );
  });
});
