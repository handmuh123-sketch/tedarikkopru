import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";
import {
  calculateLineAmounts,
  isValidOrderQuantity,
  meetsMinimumOrder,
  sumOrderAmounts,
} from "@/modules/orders/domain/cart-rules";
import { createPublicOrderNumber } from "@/modules/orders/domain/order-number";

const RESERVATION_MINUTES = 15;

type RequestEvidence = {
  actorUserId: string;
  requestId: string;
  network?: string;
};

type CheckoutInput = RequestEvidence & {
  buyerOrganizationId: string;
  deliveryAddressId: string;
  invoiceAddressId: string;
  idempotencyKey: string;
  now?: Date;
};

const cartInclude = {
  supplierOrganization: { select: { id: true, tradeName: true, minimumOrderAmountMinor: true } },
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
                take: 1,
              },
            },
          },
        },
      },
      quote: {
        include: {
          rfq: {
            select: {
              buyerOrganizationId: true,
              supplierOrganizationId: true,
              productId: true,
              variantId: true,
              status: true,
              targetQuantity: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export function cartView(cart: CartRecord | null) {
  if (!cart) return { id: null, supplier: null, items: [], subtotalAmountMinor: 0 };
  const items = cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    variantId: item.variant.id,
    sku: item.variant.sku,
    variantTitle: item.variant.title,
    productTitle: item.variant.product.title,
    productSlug: item.variant.product.slug,
    image: item.variant.product.images[0]?.storageKey ?? null,
    moq: item.variant.moq,
    quantityStep: item.variant.quantityStep,
    quoteId: item.quoteId,
    isQuoted: Boolean(item.quoteId),
    unitPriceAmountMinor: item.quotedUnitPriceMinor ?? item.variant.priceAmountMinor,
    subtotalAmountMinor: calculateLineAmounts(
      item.quotedUnitPriceMinor ?? item.variant.priceAmountMinor,
      item.quantity,
      item.variant.product.vatRateBasisPoints,
    ).subtotalAmountMinor,
    availableStock: item.variant.inventory
      ? availableStock(
          item.variant.inventory.onHand,
          item.variant.inventory.safetyStock,
          item.variant.inventory.reserved,
        )
      : 0,
  }));
  return {
    id: cart.id,
    supplier: cart.supplierOrganization,
    items,
    subtotalAmountMinor: items.reduce((sum, item) => sum + item.subtotalAmountMinor, 0),
  };
}

async function requireBuyerOrganization(
  transaction: Prisma.TransactionClient,
  organizationId: string,
) {
  const organization = await transaction.organization.findFirst({
    where: {
      id: organizationId,
      type: { in: ["RESELLER", "BOTH"] },
      status: "ACTIVE",
      verificationStatus: "APPROVED",
    },
    select: { id: true },
  });
  if (!organization) {
    throw new HttpError(404, "Satın almaya uygun işletme bulunamadı.", "BUYER_NOT_FOUND");
  }
}

function assertQuantity(quantity: number, moq: number, quantityStep: number) {
  if (!isValidOrderQuantity(quantity, moq, quantityStep)) {
    throw new HttpError(
      422,
      `Miktar en az ${moq} olmalı ve ${quantityStep} adımlarıyla artmalıdır.`,
      "INVALID_QUANTITY",
    );
  }
}

function assertAvailable(
  quantity: number,
  inventory: { onHand: number; reserved: number; safetyStock: number } | null,
) {
  if (
    !inventory ||
    quantity > availableStock(inventory.onHand, inventory.safetyStock, inventory.reserved)
  ) {
    throw new HttpError(409, "İstenen miktar için kullanılabilir stok yok.", "INSUFFICIENT_STOCK");
  }
}

export async function getBuyerCart(buyerOrganizationId: string) {
  return database.cart.findUnique({
    where: { buyerOrganizationId },
    include: cartInclude,
  });
}

export async function addCartItem(input: {
  buyerOrganizationId: string;
  variantId: string;
  quantity: number;
}) {
  return database.$transaction(async (transaction) => {
    await requireBuyerOrganization(transaction, input.buyerOrganizationId);
    const variant = await transaction.productVariant.findFirst({
      where: {
        id: input.variantId,
        status: "ACTIVE",
        product: {
          status: "ACTIVE",
          supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
        },
      },
      include: { inventory: true, product: { select: { supplierOrganizationId: true } } },
    });
    if (!variant) throw new HttpError(404, "Satılabilir ürün bulunamadı.", "VARIANT_NOT_FOUND");
    assertQuantity(input.quantity, variant.moq, variant.quantityStep);
    assertAvailable(input.quantity, variant.inventory);

    const cart = await transaction.cart.upsert({
      where: { buyerOrganizationId: input.buyerOrganizationId },
      update: {},
      create: { buyerOrganizationId: input.buyerOrganizationId },
      select: { id: true },
    });
    const supplierClaim = await transaction.cart.updateMany({
      where: {
        id: cart.id,
        OR: [
          { supplierOrganizationId: null },
          { supplierOrganizationId: variant.product.supplierOrganizationId },
        ],
      },
      data: { supplierOrganizationId: variant.product.supplierOrganizationId },
    });
    if (supplierClaim.count !== 1) {
      throw new HttpError(
        409,
        "Sepette yalnız bir tedarikçinin ürünleri bulunabilir.",
        "SINGLE_SUPPLIER_CART",
      );
    }
    await transaction.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      update: {
        quantity: input.quantity,
        addedUnitPriceMinor: variant.priceAmountMinor,
        quoteId: null,
        quotedUnitPriceMinor: null,
      },
      create: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: input.quantity,
        addedUnitPriceMinor: variant.priceAmountMinor,
      },
    });
    return transaction.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
  });
}

export async function addAcceptedQuoteToCart(
  input: RequestEvidence & {
    buyerOrganizationId: string;
    rfqId: string;
    quoteId: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  return database.$transaction(async (transaction) => {
    await requireBuyerOrganization(transaction, input.buyerOrganizationId);
    const quote = await transaction.quote.findFirst({
      where: {
        id: input.quoteId,
        rfqId: input.rfqId,
        rfq: { buyerOrganizationId: input.buyerOrganizationId },
      },
      include: {
        rfq: true,
      },
    });
    if (!quote) throw new HttpError(404, "Teklif bulunamadı.", "QUOTE_NOT_FOUND");
    if (quote.status !== "ACCEPTED" || quote.rfq.status !== "ACCEPTED") {
      throw new HttpError(
        409,
        "Yalnız kabul edilen teklifler sepete eklenebilir.",
        "QUOTE_NOT_ACCEPTED",
      );
    }
    if (quote.validUntil <= now) {
      throw new HttpError(409, "Teklifin geçerlilik süresi doldu.", "QUOTE_EXPIRED");
    }
    if (quote.currency !== "TRY" || quote.unitPriceAmountMinor < 0) {
      throw new HttpError(409, "Teklif fiyatı checkout için uygun değil.", "QUOTE_INVALID_PRICE");
    }
    const variant = await transaction.productVariant.findFirst({
      where: {
        id: quote.rfq.variantId,
        productId: quote.rfq.productId,
        supplierOrganizationId: quote.rfq.supplierOrganizationId,
        status: "ACTIVE",
        product: {
          status: "ACTIVE",
          supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
        },
      },
      include: { inventory: true },
    });
    if (!variant)
      throw new HttpError(409, "Teklif edilen ürün artık satışta değil.", "VARIANT_UNAVAILABLE");
    assertQuantity(quote.rfq.targetQuantity, variant.moq, variant.quantityStep);
    assertAvailable(quote.rfq.targetQuantity, variant.inventory);

    const cart = await transaction.cart.upsert({
      where: { buyerOrganizationId: input.buyerOrganizationId },
      update: {},
      create: { buyerOrganizationId: input.buyerOrganizationId },
      select: { id: true },
    });
    const supplierClaim = await transaction.cart.updateMany({
      where: {
        id: cart.id,
        OR: [
          { supplierOrganizationId: null },
          { supplierOrganizationId: quote.rfq.supplierOrganizationId },
        ],
      },
      data: { supplierOrganizationId: quote.rfq.supplierOrganizationId },
    });
    if (supplierClaim.count !== 1) {
      throw new HttpError(
        409,
        "Sepette yalnız bir tedarikçinin ürünleri bulunabilir.",
        "SINGLE_SUPPLIER_CART",
      );
    }
    const existingCartItem = await transaction.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      select: {
        quoteId: true,
        quantity: true,
        quotedUnitPriceMinor: true,
      },
    });
    await transaction.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      update: {
        quantity: quote.rfq.targetQuantity,
        addedUnitPriceMinor: quote.unitPriceAmountMinor,
        quoteId: quote.id,
        quotedUnitPriceMinor: quote.unitPriceAmountMinor,
      },
      create: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: quote.rfq.targetQuantity,
        addedUnitPriceMinor: quote.unitPriceAmountMinor,
        quoteId: quote.id,
        quotedUnitPriceMinor: quote.unitPriceAmountMinor,
      },
    });
    const alreadyAdded =
      existingCartItem?.quoteId === quote.id &&
      existingCartItem.quantity === quote.rfq.targetQuantity &&
      existingCartItem.quotedUnitPriceMinor === quote.unitPriceAmountMinor;
    if (!alreadyAdded) {
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: input.actorUserId,
          organizationId: input.buyerOrganizationId,
          action: "rfq.quote_added_to_cart",
          targetType: "Quote",
          targetId: quote.id,
          after: { rfqId: quote.rfqId, quantity: quote.rfq.targetQuantity },
          requestId: input.requestId,
          ...(input.network ? { network: input.network } : {}),
        }),
      });
    }
    return transaction.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
  });
}

export async function updateCartItem(input: {
  buyerOrganizationId: string;
  itemId: string;
  quantity: number;
}) {
  return database.$transaction(async (transaction) => {
    await requireBuyerOrganization(transaction, input.buyerOrganizationId);
    const item = await transaction.cartItem.findFirst({
      where: { id: input.itemId, cart: { buyerOrganizationId: input.buyerOrganizationId } },
      include: { variant: { include: { inventory: true, product: true } } },
    });
    if (!item) throw new HttpError(404, "Sepet satırı bulunamadı.", "CART_ITEM_NOT_FOUND");
    if (item.variant.status !== "ACTIVE" || item.variant.product.status !== "ACTIVE") {
      throw new HttpError(409, "Ürün artık satışta değil.", "VARIANT_UNAVAILABLE");
    }
    assertQuantity(input.quantity, item.variant.moq, item.variant.quantityStep);
    assertAvailable(input.quantity, item.variant.inventory);
    if (item.quoteId) {
      const quote = await transaction.quote.findFirst({
        where: {
          id: item.quoteId,
          status: "ACCEPTED",
          validUntil: { gt: new Date() },
          rfq: {
            buyerOrganizationId: input.buyerOrganizationId,
            supplierOrganizationId: item.variant.supplierOrganizationId,
            productId: item.variant.productId,
            variantId: item.variantId,
            status: "ACCEPTED",
            targetQuantity: input.quantity,
          },
        },
        select: { id: true, unitPriceAmountMinor: true },
      });
      if (!quote || item.quotedUnitPriceMinor !== quote.unitPriceAmountMinor) {
        throw new HttpError(
          409,
          "Teklifli satır yalnız geçerli teklif miktarıyla satın alınabilir.",
          "QUOTE_CART_ITEM_INVALID",
        );
      }
      await transaction.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity },
      });
    } else {
      await transaction.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity, addedUnitPriceMinor: item.variant.priceAmountMinor },
      });
    }
    return transaction.cart.findUniqueOrThrow({ where: { id: item.cartId }, include: cartInclude });
  });
}

export async function removeCartItem(buyerOrganizationId: string, itemId: string) {
  return database.$transaction(async (transaction) => {
    await requireBuyerOrganization(transaction, buyerOrganizationId);
    const item = await transaction.cartItem.findFirst({
      where: { id: itemId, cart: { buyerOrganizationId } },
      select: { id: true, cartId: true },
    });
    if (!item) throw new HttpError(404, "Sepet satırı bulunamadı.", "CART_ITEM_NOT_FOUND");
    await transaction.cartItem.delete({ where: { id: item.id } });
    if ((await transaction.cartItem.count({ where: { cartId: item.cartId } })) === 0) {
      await transaction.cart.update({
        where: { id: item.cartId },
        data: { supplierOrganizationId: null },
      });
    }
    return transaction.cart.findUniqueOrThrow({ where: { id: item.cartId }, include: cartInclude });
  });
}

function addressSnapshot(address: {
  id: string;
  type: string;
  title: string;
  contactName: string;
  phone: string;
  countryCode: string;
  city: string;
  district: string;
  neighborhood: string | null;
  postalCode: string | null;
  line1: string;
  line2: string | null;
}): Prisma.InputJsonObject {
  return {
    id: address.id,
    type: address.type,
    title: address.title,
    contactName: address.contactName,
    phone: address.phone,
    countryCode: address.countryCode,
    city: address.city,
    district: address.district,
    neighborhood: address.neighborhood,
    postalCode: address.postalCode,
    line1: address.line1,
    line2: address.line2,
  };
}

function checkoutRequestHash(deliveryAddressId: string, invoiceAddressId: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ deliveryAddressId, invoiceAddressId }))
    .digest("hex");
}

const checkoutResultInclude = {
  order: { include: { items: true } },
  reservations: { select: { id: true, quantity: true, status: true, expiresAt: true } },
} satisfies Prisma.CheckoutInclude;

async function existingCheckoutResult(
  buyerOrganizationId: string,
  idempotencyKey: string,
  requestHash: string,
) {
  const existing = await database.checkout.findUnique({
    where: { buyerOrganizationId_idempotencyKey: { buyerOrganizationId, idempotencyKey } },
    include: checkoutResultInclude,
  });
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    throw new HttpError(
      409,
      "Bu idempotency anahtarı farklı bir istek için kullanılmış.",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  return existing;
}

export async function createCheckoutDraft(input: CheckoutInput) {
  const requestHash = checkoutRequestHash(input.deliveryAddressId, input.invoiceAddressId);
  const existing = await existingCheckoutResult(
    input.buyerOrganizationId,
    input.idempotencyKey,
    requestHash,
  );
  if (existing) return existing;
  const now = input.now ?? new Date();
  await releaseExpiredReservations(now);

  try {
    return await database.$transaction(
      async (transaction) => {
        await requireBuyerOrganization(transaction, input.buyerOrganizationId);
        const addresses = await transaction.address.findMany({
          where: {
            organizationId: input.buyerOrganizationId,
            id: { in: [input.deliveryAddressId, input.invoiceAddressId] },
          },
        });
        const deliveryAddress = addresses.find((address) => address.id === input.deliveryAddressId);
        const invoiceAddress = addresses.find((address) => address.id === input.invoiceAddressId);
        if (!deliveryAddress || !invoiceAddress) {
          throw new HttpError(404, "Adres bulunamadı.", "ADDRESS_NOT_FOUND");
        }
        if (!["HEADQUARTERS", "WAREHOUSE"].includes(deliveryAddress.type)) {
          throw new HttpError(422, "Teslimat adresi türü uygun değil.", "INVALID_DELIVERY_ADDRESS");
        }
        if (!["HEADQUARTERS", "BILLING"].includes(invoiceAddress.type)) {
          throw new HttpError(422, "Fatura adresi türü uygun değil.", "INVALID_INVOICE_ADDRESS");
        }

        const cart = await transaction.cart.findUnique({
          where: { buyerOrganizationId: input.buyerOrganizationId },
          include: cartInclude,
        });
        if (!cart || !cart.supplierOrganizationId || cart.items.length === 0) {
          throw new HttpError(409, "Sepet boş.", "EMPTY_CART");
        }
        if (!cart.supplierOrganization) {
          throw new HttpError(409, "Sepet tedarikçisi geçersiz.", "INVALID_CART_SUPPLIER");
        }

        const lineSnapshots = cart.items.map((item) => {
          const { variant } = item;
          if (
            variant.status !== "ACTIVE" ||
            variant.product.status !== "ACTIVE" ||
            variant.supplierOrganizationId !== cart.supplierOrganizationId
          ) {
            throw new HttpError(409, "Sepette satışa kapalı ürün var.", "VARIANT_UNAVAILABLE");
          }
          assertQuantity(item.quantity, variant.moq, variant.quantityStep);
          assertAvailable(item.quantity, variant.inventory);
          let unitPriceAmountMinor = variant.priceAmountMinor;
          if (item.quoteId) {
            const quote = item.quote;
            if (
              !quote ||
              quote.status !== "ACCEPTED" ||
              quote.validUntil <= now ||
              quote.currency !== "TRY" ||
              quote.unitPriceAmountMinor < 0 ||
              item.quotedUnitPriceMinor !== quote.unitPriceAmountMinor ||
              quote.rfq.status !== "ACCEPTED" ||
              quote.rfq.buyerOrganizationId !== input.buyerOrganizationId ||
              quote.rfq.supplierOrganizationId !== cart.supplierOrganizationId ||
              quote.supplierOrganizationId !== cart.supplierOrganizationId ||
              quote.rfq.productId !== variant.productId ||
              quote.rfq.variantId !== variant.id ||
              quote.rfq.targetQuantity !== item.quantity
            ) {
              throw new HttpError(
                409,
                "Sepetteki teklif artık checkout için uygun değil.",
                "QUOTE_CART_ITEM_INVALID",
              );
            }
            unitPriceAmountMinor = quote.unitPriceAmountMinor;
          }
          const amounts = calculateLineAmounts(
            unitPriceAmountMinor,
            item.quantity,
            variant.product.vatRateBasisPoints,
          );
          return { item, amounts, unitPriceAmountMinor };
        });
        const totals = sumOrderAmounts(lineSnapshots.map(({ amounts }) => amounts));
        if (
          !meetsMinimumOrder(
            totals.subtotalAmountMinor,
            cart.supplierOrganization.minimumOrderAmountMinor,
          )
        ) {
          throw new HttpError(
            422,
            "Tedarikçinin minimum sipariş tutarı karşılanmıyor.",
            "MINIMUM_ORDER_NOT_MET",
          );
        }

        const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60_000);
        const deliverySnapshot = addressSnapshot(deliveryAddress);
        const invoiceSnapshot = addressSnapshot(invoiceAddress);
        const checkout = await transaction.checkout.create({
          data: {
            buyerOrganizationId: input.buyerOrganizationId,
            supplierOrganizationId: cart.supplierOrganizationId,
            idempotencyKey: input.idempotencyKey,
            requestHash,
            subtotalAmountMinor: totals.subtotalAmountMinor,
            vatAmountMinor: totals.vatAmountMinor,
            totalAmountMinor: totals.totalAmountMinor,
            deliveryAddressSnapshot: deliverySnapshot,
            invoiceAddressSnapshot: invoiceSnapshot,
            expiresAt,
          },
        });

        for (const { item } of lineSnapshots) {
          const inventory = item.variant.inventory!;
          const claimed = await transaction.$queryRaw<
            Array<{ id: string; reservedAfter: number; onHand: number; safetyStock: number }>
          >(Prisma.sql`
            UPDATE "inventories"
            SET "reserved" = "reserved" + ${item.quantity},
                "version" = "version" + 1,
                "updated_at" = ${now}
            WHERE "id" = ${inventory.id}
              AND "on_hand" - "reserved" - "safety_stock" >= ${item.quantity}
            RETURNING "id", "reserved" AS "reservedAfter", "on_hand" AS "onHand",
                      "safety_stock" AS "safetyStock"
          `);
          if (claimed.length !== 1) {
            throw new HttpError(
              409,
              "Stok başka bir checkout tarafından ayrıldı.",
              "INSUFFICIENT_STOCK",
            );
          }
          await transaction.stockReservation.create({
            data: {
              checkoutId: checkout.id,
              inventoryId: inventory.id,
              quantity: item.quantity,
              expiresAt,
            },
          });
          await transaction.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "RESERVATION",
              quantityDelta: 0,
              balanceAfter: claimed[0]!.onHand,
              safetyStockAfter: claimed[0]!.safetyStock,
              reservedDelta: item.quantity,
              reservedAfter: claimed[0]!.reservedAfter,
              referenceType: "Checkout",
              referenceId: checkout.id,
              reason: "Checkout stok rezervasyonu",
              actorUserId: input.actorUserId,
            },
          });
        }

        const order = await transaction.order.create({
          data: {
            publicNumber: createPublicOrderNumber(now),
            checkoutId: checkout.id,
            buyerOrganizationId: input.buyerOrganizationId,
            supplierOrganizationId: cart.supplierOrganizationId,
            subtotalAmountMinor: totals.subtotalAmountMinor,
            vatAmountMinor: totals.vatAmountMinor,
            totalAmountMinor: totals.totalAmountMinor,
            deliveryAddressSnapshot: deliverySnapshot,
            invoiceAddressSnapshot: invoiceSnapshot,
          },
        });
        for (const { item, amounts, unitPriceAmountMinor } of lineSnapshots) {
          const variant = item.variant;
          const image = variant.product.images[0];
          await transaction.orderItem.create({
            data: {
              orderId: order.id,
              sourceProductId: variant.productId,
              sourceVariantId: variant.id,
              productTitleSnapshot: variant.product.title,
              variantTitleSnapshot: variant.title,
              skuSnapshot: variant.sku,
              optionValuesSnapshot:
                variant.optionValues === null
                  ? Prisma.JsonNull
                  : (variant.optionValues as Prisma.InputJsonValue),
              imageSnapshot: image
                ? { storageKey: image.storageKey, altText: image.altText }
                : Prisma.DbNull,
              quantity: item.quantity,
              unitPriceAmountMinor,
              subtotalAmountMinor: amounts.subtotalAmountMinor,
              vatRateBasisPoints: variant.product.vatRateBasisPoints,
              vatAmountMinor: amounts.vatAmountMinor,
              totalAmountMinor: amounts.totalAmountMinor,
            },
          });
        }
        await transaction.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: "DRAFT",
            reasonCode: "checkout_draft_created",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { checkoutId: checkout.id },
          },
        });
        await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
        await transaction.cart.update({
          where: { id: cart.id },
          data: { supplierOrganizationId: null },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.buyerOrganizationId,
            action: "checkout.draft_created",
            targetType: "Checkout",
            targetId: checkout.id,
            after: { itemCount: lineSnapshots.length, reservationMinutes: RESERVATION_MINUTES },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return transaction.checkout.findUniqueOrThrow({
          where: { id: checkout.id },
          include: checkoutResultInclude,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const result = await existingCheckoutResult(
        input.buyerOrganizationId,
        input.idempotencyKey,
        requestHash,
      );
      if (result) return result;
    }
    const transactionError = error as {
      code?: string;
      message?: string;
      meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } };
    };
    const databaseCode =
      transactionError.meta?.code ??
      transactionError.meta?.driverAdapterError?.cause?.originalCode ??
      transactionError.code;
    if (
      transactionError.code === "P2034" ||
      databaseCode === "40001" ||
      /could not serialize|serialization failure|write conflict/i.test(
        transactionError.message ?? "",
      )
    ) {
      throw new HttpError(
        409,
        "Checkout eşzamanlı işlem nedeniyle tamamlanamadı; tekrar deneyin.",
        "CHECKOUT_CONFLICT",
      );
    }
    throw error;
  }
}

export async function releaseCheckoutInTransaction(
  transaction: Prisma.TransactionClient,
  checkoutId: string,
  now: Date,
  actorUserId: string | null,
  requestId: string,
  network?: string,
  manual = false,
) {
  const checkout = await transaction.checkout.findUnique({
    where: { id: checkoutId },
    include: { reservations: true, order: true },
  });
  if (!checkout || !["DRAFT", "PAYMENT_PROCESSING"].includes(checkout.status)) return false;
  if (!manual && checkout.expiresAt > now) return false;

  let releasedCount = 0;
  for (const reservation of checkout.reservations) {
    const claimed = await transaction.stockReservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "RELEASED", releasedAt: now },
    });
    if (claimed.count !== 1) continue;
    const inventoryRows = await transaction.$queryRaw<
      Array<{ reservedAfter: number; onHand: number; safetyStock: number }>
    >(Prisma.sql`
      UPDATE "inventories"
      SET "reserved" = "reserved" - ${reservation.quantity},
          "version" = "version" + 1,
          "updated_at" = ${now}
      WHERE "id" = ${reservation.inventoryId} AND "reserved" >= ${reservation.quantity}
      RETURNING "reserved" AS "reservedAfter", "on_hand" AS "onHand",
                "safety_stock" AS "safetyStock"
    `);
    if (inventoryRows.length !== 1) throw new Error("Rezervasyon stok sayacı tutarsız.");
    await transaction.inventoryMovement.create({
      data: {
        inventoryId: reservation.inventoryId,
        type: "RESERVATION_RELEASE",
        quantityDelta: 0,
        balanceAfter: inventoryRows[0]!.onHand,
        safetyStockAfter: inventoryRows[0]!.safetyStock,
        reservedDelta: -reservation.quantity,
        reservedAfter: inventoryRows[0]!.reservedAfter,
        referenceType: "Checkout",
        referenceId: checkout.id,
        reason: manual
          ? "Checkout rezervasyonu kullanıcı tarafından bırakıldı"
          : "Checkout rezervasyonu süresi doldu",
        actorUserId,
      },
    });
    releasedCount += 1;
  }
  await transaction.checkout.update({
    where: { id: checkout.id },
    data: { status: manual ? "CANCELLED" : "EXPIRED" },
  });
  const orderChanged = await transaction.order.updateMany({
    where: { checkoutId: checkout.id, status: { in: ["DRAFT", "PAYMENT_PROCESSING"] } },
    data: { status: "CANCELLED" },
  });
  if (orderChanged.count === 1 && checkout.order) {
    await transaction.orderStatusHistory.create({
      data: {
        orderId: checkout.order.id,
        fromStatus: checkout.order.status,
        toStatus: "CANCELLED",
        reasonCode: manual ? "reservation_cancelled" : "reservation_expired",
        actorType: actorUserId ? "USER" : "SYSTEM",
        actorId: actorUserId,
        metadata: { releasedCount },
      },
    });
  }
  await transaction.payment.updateMany({
    where: { checkoutId: checkout.id, status: "PENDING" },
    data: {
      status: manual ? "CANCELLED" : "EXPIRED",
      failedAt: now,
      failureCode: manual ? "RESERVATION_CANCELLED" : "RESERVATION_EXPIRED",
    },
  });
  await transaction.auditLog.create({
    data: buildAuditLogData({
      ...(actorUserId ? { actorId: actorUserId } : {}),
      organizationId: checkout.buyerOrganizationId,
      action: manual ? "checkout.reservation_cancelled" : "checkout.reservation_expired",
      targetType: "Checkout",
      targetId: checkout.id,
      after: { releasedCount },
      requestId,
      ...(network ? { network } : {}),
    }),
  });
  return true;
}

export async function releaseExpiredReservations(now = new Date()) {
  const expired = await database.checkout.findMany({
    where: { status: { in: ["DRAFT", "PAYMENT_PROCESSING"] }, expiresAt: { lte: now } },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: 100,
  });
  let released = 0;
  for (const checkout of expired) {
    const changed = await database.$transaction((transaction) =>
      releaseCheckoutInTransaction(
        transaction,
        checkout.id,
        now,
        null,
        `system-release-${checkout.id}`,
      ),
    );
    if (changed) released += 1;
  }
  return released;
}

export async function releaseCheckout(
  input: RequestEvidence & { buyerOrganizationId: string; checkoutId: string },
) {
  return database.$transaction(async (transaction) => {
    const owned = await transaction.checkout.findFirst({
      where: { id: input.checkoutId, buyerOrganizationId: input.buyerOrganizationId },
      select: { id: true },
    });
    if (!owned) throw new HttpError(404, "Checkout bulunamadı.", "CHECKOUT_NOT_FOUND");
    await releaseCheckoutInTransaction(
      transaction,
      owned.id,
      new Date(),
      input.actorUserId,
      input.requestId,
      input.network,
      true,
    );
    return transaction.checkout.findUniqueOrThrow({
      where: { id: owned.id },
      include: checkoutResultInclude,
    });
  });
}
