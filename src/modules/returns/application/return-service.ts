import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import {
  returnCreateResult,
  returnDecisionResult,
  returnReceiptResult,
  type ReturnDecision,
} from "@/modules/returns/domain/return-rules";

type RequestEvidence = {
  actorUserId: string;
  requestId: string;
  network?: string;
};

type ReturnLineInput = { orderItemId: string; quantity: number };

type CreateReturnInput = RequestEvidence & {
  buyerOrganizationId: string;
  orderId: string;
  reason: "DAMAGED" | "DEFECTIVE" | "WRONG_ITEM" | "NOT_AS_DESCRIBED" | "OTHER";
  buyerNote?: string;
  items: ReturnLineInput[];
  idempotencyKey: string;
};

type DecideReturnInput = RequestEvidence & {
  supplierOrganizationId: string;
  orderId: string;
  returnRequestId: string;
  decision: ReturnDecision;
  idempotencyKey: string;
  now?: Date;
};

type ReceiveReturnInput = RequestEvidence & {
  supplierOrganizationId: string;
  orderId: string;
  returnRequestId: string;
  idempotencyKey: string;
  now?: Date;
};

const returnSelect = {
  id: true,
  orderId: true,
  status: true,
  reason: true,
  createdAt: true,
  decidedAt: true,
  receivedAt: true,
} satisfies Prisma.ReturnRequestSelect;

type ReturnResult = Prisma.ReturnRequestGetPayload<{ select: typeof returnSelect }>;

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function idempotencyConflict(): HttpError {
  return new HttpError(
    409,
    "Bu idempotency anahtarı farklı bir istek için kullanılmış.",
    "IDEMPOTENCY_CONFLICT",
  );
}

function returnCreateConflict(status: string): HttpError {
  return new HttpError(
    409,
    `Sipariş ${status} durumundayken iade talebi oluşturulamaz.`,
    "INVALID_RETURN_CREATE_TRANSITION",
  );
}

function returnDecisionConflict(status: string): HttpError {
  return new HttpError(
    409,
    `İade talebi ${status} durumundayken tedarikçi kararı verilemez.`,
    "INVALID_RETURN_DECISION_TRANSITION",
  );
}

function returnReceiptConflict(status: string): HttpError {
  return new HttpError(
    409,
    `İade talebi ${status} durumundayken ürün teslim alınmış olarak işaretlenemez.`,
    "INVALID_RETURN_RECEIPT_TRANSITION",
  );
}

function concurrentUpdateError(): HttpError {
  return new HttpError(
    409,
    "İade durumu eşzamanlı olarak değişti. Lütfen tekrar deneyin.",
    "RETURN_CONCURRENT_UPDATE",
  );
}

function isSerializationFailure(error: unknown): boolean {
  const transactionError = error as {
    code?: string;
    message?: string;
    meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } };
  };
  const databaseCode =
    transactionError.meta?.code ??
    transactionError.meta?.driverAdapterError?.cause?.originalCode ??
    transactionError.code;
  return (
    transactionError.code === "P2034" ||
    databaseCode === "40001" ||
    /could not serialize|serialization failure|write conflict/i.test(transactionError.message ?? "")
  );
}

function normalizeItems(items: readonly ReturnLineInput[]): ReturnLineInput[] {
  return [...items].sort((left, right) => left.orderItemId.localeCompare(right.orderItemId));
}

function asReturnResult(value: {
  id: string;
  orderId: string;
  status: ReturnResult["status"];
  reason: ReturnResult["reason"];
  createdAt: Date;
  decidedAt: Date | null;
  receivedAt: Date | null;
}): ReturnResult {
  return value;
}

async function findCreateReplay(
  transaction: Prisma.TransactionClient,
  buyerOrganizationId: string,
  idempotencyKey: string,
  hash: string,
): Promise<ReturnResult | null> {
  const existing = await transaction.returnRequest.findUnique({
    where: {
      buyerOrganizationId_createIdempotencyKey: { buyerOrganizationId, createIdempotencyKey: idempotencyKey },
    },
    select: { ...returnSelect, createRequestHash: true },
  });
  if (!existing) return null;
  if (existing.createRequestHash !== hash) throw idempotencyConflict();
  return asReturnResult(existing);
}

async function findDecisionReplay(
  transaction: Prisma.TransactionClient,
  supplierOrganizationId: string,
  idempotencyKey: string,
  hash: string,
): Promise<ReturnResult | null> {
  const existing = await transaction.returnRequest.findUnique({
    where: {
      supplierOrganizationId_decisionIdempotencyKey: {
        supplierOrganizationId,
        decisionIdempotencyKey: idempotencyKey,
      },
    },
    select: { ...returnSelect, decisionRequestHash: true },
  });
  if (!existing) return null;
  if (existing.decisionRequestHash !== hash) throw idempotencyConflict();
  return asReturnResult(existing);
}

async function findReceiptReplay(
  transaction: Prisma.TransactionClient,
  supplierOrganizationId: string,
  idempotencyKey: string,
  hash: string,
): Promise<ReturnResult | null> {
  const existing = await transaction.returnRequest.findUnique({
    where: {
      supplierOrganizationId_receiptIdempotencyKey: {
        supplierOrganizationId,
        receiptIdempotencyKey: idempotencyKey,
      },
    },
    select: { ...returnSelect, receiptRequestHash: true },
  });
  if (!existing) return null;
  if (existing.receiptRequestHash !== hash) throw idempotencyConflict();
  return asReturnResult(existing);
}

function proportionalAmount(
  lineTotalAmountMinor: number,
  totalQuantity: number,
  cumulativeQuantity: number,
): number {
  const amount =
    (BigInt(lineTotalAmountMinor) * BigInt(cumulativeQuantity)) / BigInt(totalQuantity);
  if (amount < 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new HttpError(409, "İade tutarı güvenli aralığın dışında.", "INVALID_REFUND_AMOUNT");
  }
  return Number(amount);
}

export async function createReturnRequest(input: CreateReturnInput): Promise<ReturnResult> {
  const items = normalizeItems(input.items);
  const hash = requestHash({
    orderId: input.orderId,
    reason: input.reason,
    buyerNote: input.buyerNote ?? null,
    items,
  });

  try {
    return await database.$transaction(
      async (transaction) => {
        const replay = await findCreateReplay(
          transaction,
          input.buyerOrganizationId,
          input.idempotencyKey,
          hash,
        );
        if (replay) return replay;

        const order = await transaction.order.findFirst({
          where: { id: input.orderId, buyerOrganizationId: input.buyerOrganizationId },
          select: {
            id: true,
            status: true,
            supplierOrganizationId: true,
            items: { select: { id: true, quantity: true } },
          },
        });
        if (!order) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");
        if (returnCreateResult(order.status) !== "APPLY") throw returnCreateConflict(order.status);

        const orderedQuantities = new Map(order.items.map((item) => [item.id, item.quantity]));
        for (const item of items) {
          if (!orderedQuantities.has(item.orderItemId)) {
            throw new HttpError(404, "Sipariş satırı bulunamadı.", "ORDER_ITEM_NOT_FOUND");
          }
        }
        const existingItems = await transaction.returnItem.findMany({
          where: {
            orderItemId: { in: items.map((item) => item.orderItemId) },
            returnRequest: { orderId: order.id, status: { not: "REJECTED" } },
          },
          select: { orderItemId: true, quantity: true },
        });
        const claimedQuantities = new Map<string, number>();
        for (const existing of existingItems) {
          claimedQuantities.set(
            existing.orderItemId,
            (claimedQuantities.get(existing.orderItemId) ?? 0) + existing.quantity,
          );
        }
        for (const item of items) {
          const orderedQuantity = orderedQuantities.get(item.orderItemId)!;
          const claimedQuantity = claimedQuantities.get(item.orderItemId) ?? 0;
          if (item.quantity + claimedQuantity > orderedQuantity) {
            throw new HttpError(
              409,
              "Talep edilen iade miktarı sipariş edilen veya ayrılmış miktarı aşıyor.",
              "RETURN_QUANTITY_EXCEEDED",
            );
          }
        }

        const returnRequest = await transaction.returnRequest.create({
          data: {
            orderId: order.id,
            buyerOrganizationId: input.buyerOrganizationId,
            supplierOrganizationId: order.supplierOrganizationId,
            status: "REQUESTED",
            reason: input.reason,
            buyerNote: input.buyerNote ?? null,
            requestedByUserId: input.actorUserId,
            createIdempotencyKey: input.idempotencyKey,
            createRequestHash: hash,
            items: { create: items },
            statusHistory: {
              create: {
                toStatus: "REQUESTED",
                reasonCode: "buyer_return_requested",
                actorType: "USER",
                actorId: input.actorUserId,
                metadata: { itemCount: items.length },
              },
            },
          },
          select: returnSelect,
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.buyerOrganizationId,
            action: "return.requested",
            targetType: "ReturnRequest",
            targetId: returnRequest.id,
            after: { status: returnRequest.status, reason: returnRequest.reason, itemCount: items.length },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return returnRequest;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await findCreateReplay(
        database,
        input.buyerOrganizationId,
        input.idempotencyKey,
        hash,
      );
      if (replay) return replay;
    }
    if (isSerializationFailure(error)) throw concurrentUpdateError();
    throw error;
  }
}

export async function decideReturnRequest(input: DecideReturnInput): Promise<ReturnResult> {
  const now = input.now ?? new Date();
  const hash = requestHash({ returnRequestId: input.returnRequestId, decision: input.decision });

  try {
    return await database.$transaction(
      async (transaction) => {
        const replay = await findDecisionReplay(
          transaction,
          input.supplierOrganizationId,
          input.idempotencyKey,
          hash,
        );
        if (replay) return replay;

        const returnRequest = await transaction.returnRequest.findFirst({
          where: {
            id: input.returnRequestId,
            orderId: input.orderId,
            supplierOrganizationId: input.supplierOrganizationId,
          },
          include: {
            items: {
              include: {
                orderItem: {
                  select: { id: true, quantity: true, totalAmountMinor: true },
                },
              },
            },
            order: {
              select: {
                id: true,
                status: true,
                currency: true,
                payments: { where: { status: "SUCCEEDED" }, select: { id: true }, take: 1 },
              },
            },
          },
        });
        if (!returnRequest) {
          throw new HttpError(404, "İade talebi bulunamadı.", "RETURN_REQUEST_NOT_FOUND");
        }
        const transition = returnDecisionResult(returnRequest.status, input.decision);
        if (transition === "REPLAY") return transaction.returnRequest.findUniqueOrThrow({ where: { id: returnRequest.id }, select: returnSelect });
        if (transition !== "APPLY") throw returnDecisionConflict(returnRequest.status);
        if (returnRequest.order.status !== "DELIVERED") {
          throw returnCreateConflict(returnRequest.order.status);
        }

        const claimed = await transaction.returnRequest.updateMany({
          where: { id: returnRequest.id, status: "REQUESTED" },
          data: {
            status: input.decision,
            decidedAt: now,
            decisionIdempotencyKey: input.idempotencyKey,
            decisionRequestHash: hash,
          },
        });
        if (claimed.count !== 1) {
          const current = await transaction.returnRequest.findFirst({
            where: { id: returnRequest.id, supplierOrganizationId: input.supplierOrganizationId },
            select: returnSelect,
          });
          if (!current) throw new HttpError(404, "İade talebi bulunamadı.", "RETURN_REQUEST_NOT_FOUND");
          if (returnDecisionResult(current.status, input.decision) === "REPLAY") return current;
          throw returnDecisionConflict(current.status);
        }

        let refundAmountMinor = 0;
        let refundId: string | null = null;
        if (input.decision === "ACCEPTED") {
          const payment = returnRequest.order.payments[0];
          if (!payment) {
            throw new HttpError(409, "İade için tamamlanmış ödeme bulunamadı.", "REFUND_PAYMENT_NOT_FOUND");
          }
          const existingRefundItems = await transaction.refundItem.findMany({
            where: { orderItemId: { in: returnRequest.items.map((item) => item.orderItemId) } },
            select: { orderItemId: true, quantity: true, amountMinor: true },
          });
          const refundedQuantities = new Map<string, number>();
          const refundedAmounts = new Map<string, number>();
          for (const item of existingRefundItems) {
            refundedQuantities.set(item.orderItemId, (refundedQuantities.get(item.orderItemId) ?? 0) + item.quantity);
            refundedAmounts.set(item.orderItemId, (refundedAmounts.get(item.orderItemId) ?? 0) + item.amountMinor);
          }
          const refundItems = returnRequest.items.map((item) => {
            const priorQuantity = refundedQuantities.get(item.orderItemId) ?? 0;
            const priorAmount = refundedAmounts.get(item.orderItemId) ?? 0;
            const cumulativeQuantity = priorQuantity + item.quantity;
            if (cumulativeQuantity > item.orderItem.quantity) {
              throw new HttpError(
                409,
                "Bu sipariş satırı için iade tutarı zaten kaydedildi.",
                "REFUND_QUANTITY_EXCEEDED",
              );
            }
            const cumulativeAmount = proportionalAmount(
              item.orderItem.totalAmountMinor,
              item.orderItem.quantity,
              cumulativeQuantity,
            );
            const amountMinor = cumulativeAmount - priorAmount;
            if (amountMinor < 0) {
              throw new HttpError(409, "İade tutarı tutarsız.", "INVALID_REFUND_AMOUNT");
            }
            refundAmountMinor += amountMinor;
            return { orderItemId: item.orderItemId, quantity: item.quantity, amountMinor };
          });
          const refund = await transaction.refund.create({
            data: {
              returnRequestId: returnRequest.id,
              orderId: returnRequest.orderId,
              paymentId: payment.id,
              status: "RECORDED",
              currency: returnRequest.order.currency,
              amountMinor: refundAmountMinor,
              recordedByUserId: input.actorUserId,
              recordedAt: now,
              items: { create: refundItems },
            },
            select: { id: true },
          });
          refundId = refund.id;
        }

        const reasonCode =
          input.decision === "ACCEPTED" ? "supplier_return_accepted" : "supplier_return_rejected";
        await transaction.returnStatusHistory.create({
          data: {
            returnRequestId: returnRequest.id,
            fromStatus: "REQUESTED",
            toStatus: input.decision,
            reasonCode,
            actorType: "USER",
            actorId: input.actorUserId,
            metadata:
              input.decision === "ACCEPTED"
                ? { refundAmountMinor, refundId }
                : { refundCreated: false },
          },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.supplierOrganizationId,
            action: input.decision === "ACCEPTED" ? "return.accepted" : "return.rejected",
            targetType: "ReturnRequest",
            targetId: returnRequest.id,
            before: { status: "REQUESTED" },
            after:
              input.decision === "ACCEPTED"
                ? { status: "ACCEPTED", refundAmountMinor }
                : { status: "REJECTED" },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return transaction.returnRequest.findUniqueOrThrow({
          where: { id: returnRequest.id },
          select: returnSelect,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await findDecisionReplay(
        database,
        input.supplierOrganizationId,
        input.idempotencyKey,
        hash,
      );
      if (replay) return replay;
    }
    if (isSerializationFailure(error)) throw concurrentUpdateError();
    throw error;
  }
}

export async function receiveReturnRequest(input: ReceiveReturnInput): Promise<ReturnResult> {
  const now = input.now ?? new Date();
  const hash = requestHash({ returnRequestId: input.returnRequestId });

  try {
    return await database.$transaction(
      async (transaction) => {
        const replay = await findReceiptReplay(
          transaction,
          input.supplierOrganizationId,
          input.idempotencyKey,
          hash,
        );
        if (replay) return replay;

        const returnRequest = await transaction.returnRequest.findFirst({
          where: {
            id: input.returnRequestId,
            orderId: input.orderId,
            supplierOrganizationId: input.supplierOrganizationId,
          },
          include: {
            items: { include: { orderItem: { select: { sourceVariantId: true } } } },
            refund: { select: { id: true } },
          },
        });
        if (!returnRequest) {
          throw new HttpError(404, "İade talebi bulunamadı.", "RETURN_REQUEST_NOT_FOUND");
        }
        const transition = returnReceiptResult(returnRequest.status);
        if (transition === "REPLAY") return transaction.returnRequest.findUniqueOrThrow({ where: { id: returnRequest.id }, select: returnSelect });
        if (transition !== "APPLY") throw returnReceiptConflict(returnRequest.status);
        if (!returnRequest.refund) {
          throw new HttpError(409, "Kabul edilmiş refund kaydı bulunamadı.", "REFUND_NOT_FOUND");
        }

        const claimed = await transaction.returnRequest.updateMany({
          where: { id: returnRequest.id, status: "ACCEPTED" },
          data: {
            status: "RETURN_RECEIVED",
            receivedAt: now,
            receiptIdempotencyKey: input.idempotencyKey,
            receiptRequestHash: hash,
          },
        });
        if (claimed.count !== 1) {
          const current = await transaction.returnRequest.findFirst({
            where: { id: returnRequest.id, supplierOrganizationId: input.supplierOrganizationId },
            select: returnSelect,
          });
          if (!current) throw new HttpError(404, "İade talebi bulunamadı.", "RETURN_REQUEST_NOT_FOUND");
          if (returnReceiptResult(current.status) === "REPLAY") return current;
          throw returnReceiptConflict(current.status);
        }

        const quantitiesByVariant = new Map<string, number>();
        for (const item of returnRequest.items) {
          quantitiesByVariant.set(
            item.orderItem.sourceVariantId,
            (quantitiesByVariant.get(item.orderItem.sourceVariantId) ?? 0) + item.quantity,
          );
        }
        for (const [variantId, quantity] of quantitiesByVariant) {
          const inventories = await transaction.$queryRaw<
            Array<{ id: string; onHand: number; safetyStock: number; reserved: number }>
          >(Prisma.sql`
            UPDATE "inventories"
            SET "on_hand" = "on_hand" + ${quantity},
                "version" = "version" + 1,
                "updated_at" = ${now}
            WHERE "variant_id" = ${variantId}
            RETURNING "id", "on_hand" AS "onHand", "safety_stock" AS "safetyStock",
                      "reserved"
          `);
          const inventory = inventories[0];
          if (!inventory) {
            throw new HttpError(409, "İade ürünü için stok kaydı bulunamadı.", "INVENTORY_NOT_FOUND");
          }
          await transaction.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "RETURN_RESTORE",
              quantityDelta: quantity,
              balanceAfter: inventory.onHand,
              safetyStockAfter: inventory.safetyStock,
              reservedDelta: 0,
              reservedAfter: inventory.reserved,
              referenceType: "ReturnRequest",
              referenceId: returnRequest.id,
              reason: "Fiziksel iade teslim alındı",
              actorUserId: input.actorUserId,
            },
          });
        }
        await transaction.returnStatusHistory.create({
          data: {
            returnRequestId: returnRequest.id,
            fromStatus: "ACCEPTED",
            toStatus: "RETURN_RECEIVED",
            reasonCode: "supplier_return_received",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { itemCount: returnRequest.items.length },
          },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.supplierOrganizationId,
            action: "return.received",
            targetType: "ReturnRequest",
            targetId: returnRequest.id,
            before: { status: "ACCEPTED" },
            after: { status: "RETURN_RECEIVED", restockedItemCount: returnRequest.items.length },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return transaction.returnRequest.findUniqueOrThrow({
          where: { id: returnRequest.id },
          select: returnSelect,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await findReceiptReplay(
        database,
        input.supplierOrganizationId,
        input.idempotencyKey,
        hash,
      );
      if (replay) return replay;
    }
    if (isSerializationFailure(error)) throw concurrentUpdateError();
    throw error;
  }
}
