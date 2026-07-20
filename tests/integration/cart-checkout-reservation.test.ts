import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as addToCart } from "@/app/api/v1/organizations/[organizationId]/cart/route";
import {
  DELETE as deleteCartItem,
  PATCH as updateCartItem,
} from "@/app/api/v1/organizations/[organizationId]/cart/items/[itemId]/route";
import { POST as createCheckout } from "@/app/api/v1/organizations/[organizationId]/checkout/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { releaseExpiredReservations } from "@/modules/orders/application/order-service";

const baseUrl = "http://127.0.0.1:3000";
const password = "Cart-Integration-2026!";

function request(path: string, method: string, body?: unknown, cookie?: string, key?: string) {
  return new Request(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      origin: baseUrl,
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 1)}`,
      ...(cookie ? { cookie } : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function register(label: string) {
  const email = `cart-${label}-${randomUUID()}@example.test`;
  await auth.handler(
    request("/api/auth/sign-up/email", "POST", {
      name: `Cart ${label}`,
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

async function createOrganization(userId: string, type: "SUPPLIER" | "RESELLER", label: string) {
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
      phone: "+90 212 555 0707",
      email: `${suffix}@example.test`,
      authorizedPerson: "Test Yetkilisi",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      memberships: {
        create: { userId, role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
      },
    },
  });
}

async function createAddresses(organizationId: string) {
  const delivery = await database.address.create({
    data: {
      organizationId,
      type: "WAREHOUSE",
      title: "Teslimat Deposu",
      contactName: "Test Alıcı",
      phone: "+90 212 555 0707",
      city: "İstanbul",
      district: "Kadıköy",
      line1: "Test Sokak No: 1",
    },
  });
  const invoice = await database.address.create({
    data: {
      organizationId,
      type: "BILLING",
      title: "Fatura Merkezi",
      contactName: "Test Alıcı",
      phone: "+90 212 555 0707",
      city: "İstanbul",
      district: "Kadıköy",
      line1: "Test Sokak No: 2",
    },
  });
  const invoiceTwo = await database.address.create({
    data: {
      organizationId,
      type: "BILLING",
      title: "İkinci Fatura",
      contactName: "Test Alıcı",
      phone: "+90 212 555 0707",
      city: "İstanbul",
      district: "Kadıköy",
      line1: "Test Sokak No: 3",
    },
  });
  return { delivery, invoice, invoiceTwo };
}

async function createVariant(supplierOrganizationId: string, label: string, stock = 20) {
  const suffix = randomUUID().slice(0, 8);
  const category = await database.category.create({
    data: {
      name: `Cart ${label}`,
      slug: `cart-${label}-${suffix}`,
      path: `cart-${label}-${suffix}`,
    },
  });
  const brand = await database.brand.create({
    data: { name: `Cart Brand ${label}`, slug: `cart-brand-${label}-${suffix}` },
  });
  const product = await database.product.create({
    data: {
      supplierOrganizationId,
      categoryId: category.id,
      brandId: brand.id,
      title: `Pilot ${label}`,
      slug: `pilot-${label}-${suffix}`,
      shortDescription: "Faz 3A checkout entegrasyon ürünü.",
      description: "Sepet, checkout ve rezervasyon entegrasyon testi için yeterince uzun açıklama.",
      status: "ACTIVE",
      publishedAt: new Date(),
      vatRateBasisPoints: 2_000,
    },
  });
  const variant = await database.productVariant.create({
    data: {
      productId: product.id,
      supplierOrganizationId,
      sku: `CART-${label}-${suffix}`.toUpperCase(),
      title: "Standart",
      moq: 5,
      quantityStep: 5,
      priceAmountMinor: 1_000,
    },
  });
  const inventory = await database.inventory.create({
    data: { variantId: variant.id, supplierOrganizationId, onHand: stock, safetyStock: 0 },
  });
  return { product, variant, inventory };
}

describe("Faz 3A gerçek PostgreSQL sepet, checkout ve rezervasyon", () => {
  let buyerA: Awaited<ReturnType<typeof register>>;
  let buyerB: Awaited<ReturnType<typeof register>>;
  let viewer: Awaited<ReturnType<typeof register>>;
  let supplierUser: Awaited<ReturnType<typeof register>>;
  let supplierUserB: Awaited<ReturnType<typeof register>>;
  let buyerOrgA: Awaited<ReturnType<typeof createOrganization>>;
  let buyerOrgB: Awaited<ReturnType<typeof createOrganization>>;
  let supplierOrgA: Awaited<ReturnType<typeof createOrganization>>;
  let supplierOrgB: Awaited<ReturnType<typeof createOrganization>>;
  let addressesA: Awaited<ReturnType<typeof createAddresses>>;
  let addressesB: Awaited<ReturnType<typeof createAddresses>>;
  let variantA: Awaited<ReturnType<typeof createVariant>>;
  let variantB: Awaited<ReturnType<typeof createVariant>>;

  beforeAll(async () => {
    await database.$connect();
    [buyerA, buyerB, viewer, supplierUser, supplierUserB] = await Promise.all([
      register("buyer-a"),
      register("buyer-b"),
      register("viewer"),
      register("supplier-a"),
      register("supplier-b"),
    ]);
    buyerOrgA = await createOrganization(buyerA.user.id, "RESELLER", "CartBuyerA");
    buyerOrgB = await createOrganization(buyerB.user.id, "RESELLER", "CartBuyerB");
    supplierOrgA = await createOrganization(supplierUser.user.id, "SUPPLIER", "CartSupplierA");
    supplierOrgB = await createOrganization(supplierUserB.user.id, "SUPPLIER", "CartSupplierB");
    await database.organization.update({
      where: { id: supplierOrgA.id },
      data: { minimumOrderAmountMinor: 5_000 },
    });
    await database.organizationMembership.create({
      data: {
        organizationId: buyerOrgA.id,
        userId: viewer.user.id,
        role: "VIEWER",
        status: "ACTIVE",
      },
    });
    [addressesA, addressesB, variantA, variantB] = await Promise.all([
      createAddresses(buyerOrgA.id),
      createAddresses(buyerOrgB.id),
      createVariant(supplierOrgA.id, "A"),
      createVariant(supplierOrgB.id, "B"),
    ]);
  }, 40_000);

  afterAll(async () => database.$disconnect());

  it("org BOLA, RBAC, MOQ/step ve tek tedarikçi kuralını server tarafında uygular", async () => {
    const invalidQuantity = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variantA.variant.id, quantity: 6 },
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(invalidQuantity.status).toBe(422);

    const created = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variantA.variant.id, quantity: 5 },
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(created.status).toBe(201);
    const itemId = ((await created.json()).data as { items: Array<{ id: string }> }).items[0]!.id;

    const updated = await updateCartItem(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart/items/${itemId}`,
        "PATCH",
        { quantity: 10 },
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id, itemId }) },
    );
    expect(updated.status).toBe(200);
    const foreignUpdate = await updateCartItem(
      request(
        `/api/v1/organizations/${buyerOrgB.id}/cart/items/${itemId}`,
        "PATCH",
        { quantity: 10 },
        buyerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgB.id, itemId }) },
    );
    expect(foreignUpdate.status).toBe(404);
    const foreignDelete = await deleteCartItem(
      request(
        `/api/v1/organizations/${buyerOrgB.id}/cart/items/${itemId}`,
        "DELETE",
        undefined,
        buyerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgB.id, itemId }) },
    );
    expect(foreignDelete.status).toBe(404);
    const deleted = await deleteCartItem(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart/items/${itemId}`,
        "DELETE",
        undefined,
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id, itemId }) },
    );
    expect(deleted.status).toBe(200);
    const recreated = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variantA.variant.id, quantity: 5 },
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(recreated.status).toBe(201);

    const crossOrganization = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variantA.variant.id, quantity: 5 },
        buyerB.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(crossOrganization.status).toBe(404);

    const viewerWrite = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variantA.variant.id, quantity: 5 },
        viewer.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(viewerWrite.status).toBe(404);

    const secondSupplier = await addToCart(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/cart`,
        "POST",
        { variantId: variantB.variant.id, quantity: 5 },
        buyerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(secondSupplier.status).toBe(409);
  });

  it("adres scope, minimum tutar, idempotency ve immutable OrderItem snapshot'ını korur", async () => {
    await database.organization.update({
      where: { id: supplierOrgA.id },
      data: { minimumOrderAmountMinor: 6_000 },
    });
    const belowMinimum = await createCheckout(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/checkout`,
        "POST",
        { deliveryAddressId: addressesA.delivery.id, invoiceAddressId: addressesA.invoice.id },
        buyerA.cookie,
        `minimum-${randomUUID()}`,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(belowMinimum.status).toBe(422);
    await database.organization.update({
      where: { id: supplierOrgA.id },
      data: { minimumOrderAmountMinor: 5_000 },
    });

    const wrongAddress = await createCheckout(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/checkout`,
        "POST",
        { deliveryAddressId: addressesB.delivery.id, invoiceAddressId: addressesA.invoice.id },
        buyerA.cookie,
        `wrong-address-${randomUUID()}`,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(wrongAddress.status).toBe(404);

    const key = `checkout-${randomUUID()}`;
    const validRequest = () =>
      request(
        `/api/v1/organizations/${buyerOrgA.id}/checkout`,
        "POST",
        { deliveryAddressId: addressesA.delivery.id, invoiceAddressId: addressesA.invoice.id },
        buyerA.cookie,
        key,
      );
    const created = await createCheckout(validRequest(), {
      params: Promise.resolve({ organizationId: buyerOrgA.id }),
    });
    expect(created.status).toBe(201);
    const createdData = (await created.json()).data as {
      id: string;
      order: { id: string; publicNumber: string };
    };
    const replay = await createCheckout(validRequest(), {
      params: Promise.resolve({ organizationId: buyerOrgA.id }),
    });
    expect(replay.status).toBe(201);
    expect(((await replay.json()).data as { id: string }).id).toBe(createdData.id);
    expect(
      await database.checkout.count({
        where: { buyerOrganizationId: buyerOrgA.id, idempotencyKey: key },
      }),
    ).toBe(1);

    const conflict = await createCheckout(
      request(
        `/api/v1/organizations/${buyerOrgA.id}/checkout`,
        "POST",
        { deliveryAddressId: addressesA.delivery.id, invoiceAddressId: addressesA.invoiceTwo.id },
        buyerA.cookie,
        key,
      ),
      { params: Promise.resolve({ organizationId: buyerOrgA.id }) },
    );
    expect(conflict.status).toBe(409);

    const orderItem = await database.orderItem.findFirstOrThrow({
      where: { orderId: createdData.order.id },
    });
    const snapshotTitle = orderItem.productTitleSnapshot;
    await database.product.update({
      where: { id: variantA.product.id },
      data: { title: "Kaynak ürün değişti" },
    });
    expect(
      (await database.orderItem.findUniqueOrThrow({ where: { id: orderItem.id } }))
        .productTitleSnapshot,
    ).toBe(snapshotTitle);
    await expect(
      database.orderItem.update({ where: { id: orderItem.id }, data: { quantity: 10 } }),
    ).rejects.toThrow();
    await expect(database.orderItem.delete({ where: { id: orderItem.id } })).rejects.toThrow();
    expect(
      await database.auditLog.findFirst({
        where: { action: "checkout.draft_created", targetId: createdData.id },
      }),
    ).not.toBeNull();

    const released = await releaseExpiredReservations(new Date(Date.now() + 16 * 60_000));
    expect(released).toBeGreaterThanOrEqual(1);
    expect(
      (await database.inventory.findUniqueOrThrow({ where: { id: variantA.inventory.id } }))
        .reserved,
    ).toBe(0);
    expect(await releaseExpiredReservations(new Date(Date.now() + 17 * 60_000))).toBe(0);
  });

  it("eşzamanlı checkout'ta oversell ve negatif kullanılabilir stok oluşturmaz", async () => {
    const scarce = await createVariant(supplierOrgA.id, "SCARCE", 5);
    await Promise.all(
      [
        { org: buyerOrgA, buyer: buyerA, addresses: addressesA },
        { org: buyerOrgB, buyer: buyerB, addresses: addressesB },
      ].map(({ org, buyer }) =>
        addToCart(
          request(
            `/api/v1/organizations/${org.id}/cart`,
            "POST",
            { variantId: scarce.variant.id, quantity: 5 },
            buyer.cookie,
          ),
          { params: Promise.resolve({ organizationId: org.id }) },
        ),
      ),
    );
    const responses = await Promise.all(
      [
        { org: buyerOrgA, buyer: buyerA, addresses: addressesA },
        { org: buyerOrgB, buyer: buyerB, addresses: addressesB },
      ].map(({ org, buyer, addresses }) =>
        createCheckout(
          request(
            `/api/v1/organizations/${org.id}/checkout`,
            "POST",
            { deliveryAddressId: addresses.delivery.id, invoiceAddressId: addresses.invoice.id },
            buyer.cookie,
            `concurrent-${randomUUID()}`,
          ),
          { params: Promise.resolve({ organizationId: org.id }) },
        ),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const inventory = await database.inventory.findUniqueOrThrow({
      where: { id: scarce.inventory.id },
    });
    expect(inventory.reserved).toBe(5);
    expect(inventory.reserved).toBeLessThanOrEqual(inventory.onHand);
    await expect(
      database.inventory.update({ where: { id: inventory.id }, data: { onHand: 4 } }),
    ).rejects.toThrow();
  });
});
