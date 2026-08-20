import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as createShipment } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/shipment/route";
import { POST as deliverShipment } from "@/app/api/v1/organizations/[organizationId]/orders/[orderId]/shipment/deliver/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const baseUrl = "http://127.0.0.1:3000";
const password = "Shipment-Delivery-2026!";

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
  const email = `shipment-delivery-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Shipment delivery ${label}`,
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
      authorizedPerson: "Kargo Test Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: { create: { userId, role, status: "ACTIVE", joinedAt: new Date() } },
    },
  });
}

describe("Faz 4A gerçek PostgreSQL kargo ve teslimat", () => {
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
    const organizations = await Promise.all([
      organization(buyer.user.id, "RESELLER", "OWNER", "ShipmentDeliveryBuyer"),
      organization(
        supplierWarehouse.user.id,
        "SUPPLIER",
        "WAREHOUSE_OPERATOR",
        "ShipmentDeliverySupplier",
      ),
      organization(
        foreignSupplier.user.id,
        "SUPPLIER",
        "WAREHOUSE_OPERATOR",
        "ShipmentDeliveryForeign",
      ),
    ]);
    buyerOrganizationId = organizations[0].id;
    supplierOrganizationId = organizations[1].id;
    foreignSupplierOrganizationId = organizations[2].id;
    const suffix = randomUUID().slice(0, 8);
    const [category, brand] = await Promise.all([
      database.category.create({
        data: {
          name: `Shipment Delivery Category ${suffix}`,
          slug: `shipment-delivery-category-${suffix}`,
          path: `shipment-delivery-category-${suffix}`,
        },
      }),
      database.brand.create({
        data: {
          name: `Shipment Delivery Brand ${suffix}`,
          slug: `shipment-delivery-brand-${suffix}`,
        },
      }),
    ]);
    categoryId = category.id;
    brandId = brand.id;
  }, 40_000);

  afterAll(async () => database.$disconnect());

  async function acceptedOrder(label: string) {
    const suffix = randomUUID().slice(0, 8);
    const now = new Date();
    const product = await database.product.create({
      data: {
        supplierOrganizationId,
        categoryId,
        brandId,
        title: `Shipment Delivery ${label} ${suffix}`,
        slug: `shipment-delivery-${label.toLowerCase()}-${suffix}`,
        shortDescription: "Kargo ve teslimat test ürünü.",
        description: "Kargo geçişleri ve stok bütünlüğü için yeterince uzun test ürünü.",
        status: "ACTIVE",
        publishedAt: now,
        vatRateBasisPoints: 2_000,
      },
    });
    const variant = await database.productVariant.create({
      data: {
        productId: product.id,
        supplierOrganizationId,
        sku: `SHP-${label}-${suffix}`.toUpperCase(),
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
        idempotencyKey: `shipment-paid-${randomUUID()}`,
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
        publicNumber: `TK-SHP-${suffix.toUpperCase()}`,
        checkoutId: checkout.id,
        buyerOrganizationId,
        supplierOrganizationId,
        status: "ACCEPTED",
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
    await database.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: "PAID",
        toStatus: "ACCEPTED",
        reasonCode: "supplier_order_accepted",
        actorType: "USER",
        actorId: supplierWarehouse.user.id,
      },
    });
    return { checkout, inventory, order };
  }

  async function ship(
    organizationId: string,
    orderId: string,
    cookie: string,
    key: string,
    values?: Partial<{ carrier: string; trackingNumber: string; shippedAt: string; estimatedDeliveryAt: string }>,
  ) {
    const shippedAt = new Date(Date.now() - 86_400_000).toISOString();
    return createShipment(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/shipment`,
        "POST",
        {
          carrier: values?.carrier ?? "Pilot Kargo",
          trackingNumber: values?.trackingNumber ?? "PK-2026-0001",
          shippedAt: values?.shippedAt ?? shippedAt,
          estimatedDeliveryAt:
            values?.estimatedDeliveryAt ?? new Date(Date.now() + 86_400_000).toISOString(),
        },
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId }) },
    );
  }

  async function deliver(organizationId: string, orderId: string, cookie: string, key: string) {
    return deliverShipment(
      request(
        `/api/v1/organizations/${organizationId}/orders/${orderId}/shipment/deliver`,
        "POST",
        {},
        cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId, orderId }) },
    );
  }

  it("depo operatörü kendi kabul edilmiş siparişini bir kez kargoya verir ve teslim eder", async () => {
    const draft = await acceptedOrder("HappyPath");
    const shippingKey = `shipment-${randomUUID()}`;
    const deliveryKey = `delivery-${randomUUID()}`;
    const shippingValues = {
      carrier: "Pilot Kargo",
      trackingNumber: "PK-2026-0001",
      shippedAt: new Date(Date.now() - 86_400_000).toISOString(),
      estimatedDeliveryAt: new Date(Date.now() + 86_400_000).toISOString(),
    };

    expect(
      (
        await ship(
          foreignSupplierOrganizationId,
          draft.order.id,
          foreignSupplier.cookie,
          `foreign-${randomUUID()}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (await ship(buyerOrganizationId, draft.order.id, buyer.cookie, `buyer-${randomUUID()}`)).status,
    ).toBe(404);

    const shipped = await ship(
      supplierOrganizationId,
      draft.order.id,
      supplierWarehouse.cookie,
      shippingKey,
      shippingValues,
    );
    expect(shipped.status).toBe(201);
    const shipment = (await shipped.json()).data as { id: string; status: string };
    expect(shipment.status).toBe("SHIPPED");
    expect(
      (
        await ship(
          supplierOrganizationId,
          draft.order.id,
          supplierWarehouse.cookie,
          shippingKey,
          shippingValues,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await ship(supplierOrganizationId, draft.order.id, supplierWarehouse.cookie, shippingKey, {
          ...shippingValues,
          trackingNumber: "PK-2026-0002",
        })
      ).status,
    ).toBe(409);

    expect((await deliver(foreignSupplierOrganizationId, draft.order.id, foreignSupplier.cookie, `foreign-delivery-${randomUUID()}`)).status).toBe(404);
    const delivered = await deliver(
      supplierOrganizationId,
      draft.order.id,
      supplierWarehouse.cookie,
      deliveryKey,
    );
    expect(delivered.status).toBe(200);
    expect((await delivered.json()).data).toMatchObject({ id: shipment.id, status: "DELIVERED" });
    expect(
      (await deliver(supplierOrganizationId, draft.order.id, supplierWarehouse.cookie, deliveryKey))
        .status,
    ).toBe(200);
    expect(
      (await ship(supplierOrganizationId, draft.order.id, supplierWarehouse.cookie, `after-delivery-${randomUUID()}`)).status,
    ).toBe(409);

    const [order, persistedShipment, reservation, inventory, shipmentHistoryCount, orderHistoryCount] =
      await Promise.all([
        database.order.findUniqueOrThrow({ where: { id: draft.order.id } }),
        database.shipment.findUniqueOrThrow({ where: { id: shipment.id } }),
        database.stockReservation.findFirstOrThrow({ where: { checkoutId: draft.checkout.id } }),
        database.inventory.findUniqueOrThrow({ where: { id: draft.inventory.id } }),
        database.shipmentStatusHistory.count({ where: { shipmentId: shipment.id } }),
        database.orderStatusHistory.count({
          where: { orderId: draft.order.id, toStatus: { in: ["SHIPPED", "DELIVERED"] } },
        }),
      ]);
    expect(order.status).toBe("DELIVERED");
    expect(persistedShipment).toMatchObject({ status: "DELIVERED" });
    expect(shipmentHistoryCount).toBe(2);
    expect(orderHistoryCount).toBe(2);
    expect(reservation.status).toBe("CONSUMED");
    expect(inventory).toMatchObject({ onHand: 5, reserved: 0 });
    expect(
      await database.inventoryMovement.count({
        where: { inventoryId: inventory.id, type: "SALE", referenceId: order.id },
      }),
    ).toBe(1);
    expect(
      await database.auditLog.count({ where: { targetId: shipment.id, action: "order.shipped" } }),
    ).toBe(1);
    expect(
      await database.auditLog.count({ where: { targetId: shipment.id, action: "order.delivered" } }),
    ).toBe(1);
  });

  it("tarih doğrulaması siparişi ve kargo geçmişini değiştirmez", async () => {
    const draft = await acceptedOrder("InvalidDate");
    const invalid = await ship(
      supplierOrganizationId,
      draft.order.id,
      supplierWarehouse.cookie,
      `invalid-date-${randomUUID()}`,
      {
        shippedAt: new Date(Date.now() - 86_400_000).toISOString(),
        estimatedDeliveryAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
    );
    expect(invalid.status).toBe(422);
    expect(await database.shipment.count({ where: { orderId: draft.order.id } })).toBe(0);
    expect(
      await database.order.findUniqueOrThrow({ where: { id: draft.order.id }, select: { status: true } }),
    ).toMatchObject({ status: "ACCEPTED" });
    expect(
      await database.orderStatusHistory.count({ where: { orderId: draft.order.id, toStatus: "SHIPPED" } }),
    ).toBe(0);
  });
});
