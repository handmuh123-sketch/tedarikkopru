import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { featureFlags, serverEnvironment } from "@/lib/env/server";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import {
  releaseCheckoutInTransaction,
  releaseExpiredReservations,
} from "@/modules/orders/application/order-service";
import {
  mockPaymentDecision,
  type MockPaymentOutcome,
} from "@/modules/payments/domain/mock-payment-rules";

type RequestEvidence = {
  buyerOrganizationId: string;
  actorUserId: string;
  idempotencyKey: string;
  requestId: string;
  network?: string;
  now?: Date;
};

type PaymentProvider = "MOCK" | "BANK_TRANSFER";

const paymentInclude = {
  order: { select: { id: true, publicNumber: true, status: true } },
  attempts: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.PaymentInclude;

function assertMockPaymentEnabled() {
  if (!featureFlags.mockPayments || serverEnvironment.PAYMENT_PROVIDER !== "mock") {
    throw new HttpError(404, "Mock ödeme kullanılamıyor.", "MOCK_PAYMENT_DISABLED");
  }
  if (featureFlags.livePayments) {
    throw new HttpError(
      409,
      "Canlı ödeme modu ile mock ödeme birlikte çalışamaz.",
      "PAYMENT_MODE_CONFLICT",
    );
  }
}

function requestHash(value: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isTransactionConflict(error: unknown): boolean {
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

async function existingInitiation(
  buyerOrganizationId: string,
  idempotencyKey: string,
  hash: string,
) {
  const payment = await database.payment.findUnique({
    where: {
      buyerOrganizationId_initiationIdempotencyKey: {
        buyerOrganizationId,
        initiationIdempotencyKey: idempotencyKey,
      },
    },
    include: paymentInclude,
  });
  if (!payment) return null;
  if (payment.initiationRequestHash !== hash) {
    throw new HttpError(
      409,
      "Bu idempotency anahtarı farklı bir ödeme isteğinde kullanılmış.",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  return payment;
}

export async function initiateMockPayment(
  input: RequestEvidence & {
    orderId: string;
    provider?: PaymentProvider;
    bankTransferReference?: string;
    bankTransferNote?: string;
  },
) {
  const provider = input.provider ?? "MOCK";
  if (provider === "MOCK") assertMockPaymentEnabled();
  const hash =
    provider === "MOCK"
      ? requestHash({ orderId: input.orderId })
      : requestHash({
          orderId: input.orderId,
          provider,
          bankTransferNote: input.bankTransferNote ?? "",
        });
  const existing = await existingInitiation(input.buyerOrganizationId, input.idempotencyKey, hash);
  if (existing) return existing;
  const now = input.now ?? new Date();
  await releaseExpiredReservations(now);

  try {
    return await database.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { id: input.orderId, buyerOrganizationId: input.buyerOrganizationId },
          include: { checkout: { include: { reservations: true } }, payments: true },
        });
        if (!order) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");
        const paymentForOrder = order.payments[0];
        if (paymentForOrder) {
          if (
            paymentForOrder.initiationIdempotencyKey === input.idempotencyKey &&
            paymentForOrder.initiationRequestHash === hash
          ) {
            return transaction.payment.findUniqueOrThrow({
              where: { id: paymentForOrder.id },
              include: paymentInclude,
            });
          }
          throw new HttpError(409, "Bu sipariş için ödeme zaten başlatılmış.", "PAYMENT_EXISTS");
        }
        if (
          order.status !== "DRAFT" ||
          order.checkout.status !== "DRAFT" ||
          order.checkout.expiresAt <= now ||
          order.checkout.reservations.length === 0 ||
          order.checkout.reservations.some((reservation) => reservation.status !== "ACTIVE")
        ) {
          throw new HttpError(409, "Sipariş ödeme başlatmaya uygun değil.", "ORDER_NOT_PAYABLE");
        }

        const payment = await transaction.payment.create({
          data: {
            orderId: order.id,
            checkoutId: order.checkoutId,
            buyerOrganizationId: input.buyerOrganizationId,
            provider,
            mockReference: `${provider === "MOCK" ? "MOCK" : "BANK"}-${randomUUID()}`,
            bankTransferReference:
              provider === "BANK_TRANSFER"
                ? (input.bankTransferReference ?? `BT-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`)
                : null,
            bankTransferNote: input.bankTransferNote ?? null,
            amountMinor: order.totalAmountMinor,
            currency: order.currency,
            initiationIdempotencyKey: input.idempotencyKey,
            initiationRequestHash: hash,
            initiatedByUserId: input.actorUserId,
          },
        });
        const orderClaim = await transaction.order.updateMany({
          where: { id: order.id, buyerOrganizationId: input.buyerOrganizationId, status: "DRAFT" },
          data: { status: "PAYMENT_PROCESSING" },
        });
        const checkoutClaim = await transaction.checkout.updateMany({
          where: {
            id: order.checkoutId,
            buyerOrganizationId: input.buyerOrganizationId,
            status: "DRAFT",
          },
          data: { status: "PAYMENT_PROCESSING" },
        });
        if (orderClaim.count !== 1 || checkoutClaim.count !== 1) {
          throw new HttpError(409, "Ödeme başka bir işlemde başlatıldı.", "PAYMENT_CONFLICT");
        }
        await transaction.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: "DRAFT",
            toStatus: "PAYMENT_PROCESSING",
            reasonCode: provider === "MOCK" ? "mock_payment_started" : "bank_transfer_started",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { paymentId: payment.id },
          },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.buyerOrganizationId,
            action: provider === "MOCK" ? "payment.mock_started" : "payment.bank_transfer_started",
            targetType: "Payment",
            targetId: payment.id,
            after: { orderId: order.id, amountMinor: payment.amountMinor, status: payment.status },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return transaction.payment.findUniqueOrThrow({
          where: { id: payment.id },
          include: paymentInclude,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await existingInitiation(
        input.buyerOrganizationId,
        input.idempotencyKey,
        hash,
      );
      if (replay) return replay;
      throw new HttpError(409, "Bu sipariş için ödeme zaten başlatılmış.", "PAYMENT_EXISTS");
    }
    if (isTransactionConflict(error)) {
      throw new HttpError(
        409,
        "Ödeme eşzamanlı işlem nedeniyle başlatılamadı.",
        "PAYMENT_CONFLICT",
      );
    }
    throw error;
  }
}

async function existingCompletion(
  buyerOrganizationId: string,
  orderId: string,
  paymentId: string,
  idempotencyKey: string,
  hash: string,
  provider: PaymentProvider,
) {
  const attempt = await database.paymentAttempt.findFirst({
    where: {
      paymentId,
      idempotencyKey,
      payment: { buyerOrganizationId, orderId, provider },
    },
    include: { payment: { include: paymentInclude } },
  });
  if (!attempt) return null;
  if (attempt.requestHash !== hash) {
    throw new HttpError(
      409,
      "Bu idempotency anahtarı farklı bir ödeme sonucunda kullanılmış.",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  return attempt.payment;
}

export async function completeMockPayment(
  input: RequestEvidence & {
    orderId: string;
    paymentId: string;
    outcome: MockPaymentOutcome;
    provider?: PaymentProvider;
  },
) {
  const provider = input.provider ?? "MOCK";
  if (provider === "MOCK") assertMockPaymentEnabled();
  const hash = requestHash({ outcome: input.outcome });
  const existing = await existingCompletion(
    input.buyerOrganizationId,
    input.orderId,
    input.paymentId,
    input.idempotencyKey,
    hash,
    provider,
  );
  if (existing) return existing;
  const now = input.now ?? new Date();
  await releaseExpiredReservations(now);
  const decision = mockPaymentDecision(input.outcome);

  try {
    return await database.$transaction(
      async (transaction) => {
        const payment = await transaction.payment.findFirst({
          where: {
            id: input.paymentId,
            orderId: input.orderId,
            buyerOrganizationId: input.buyerOrganizationId,
            provider,
          },
          include: {
            order: true,
            checkout: { include: { reservations: true } },
            attempts: true,
          },
        });
        if (!payment) throw new HttpError(404, "Ödeme bulunamadı.", "PAYMENT_NOT_FOUND");
        const priorAttempt = payment.attempts[0];
        if (priorAttempt) {
          if (
            priorAttempt.idempotencyKey === input.idempotencyKey &&
            priorAttempt.requestHash === hash
          ) {
            return transaction.payment.findUniqueOrThrow({
              where: { id: payment.id },
              include: paymentInclude,
            });
          }
          throw new HttpError(409, "Ödeme zaten tamamlanmış.", "PAYMENT_ALREADY_COMPLETED");
        }
        if (
          payment.status !== "PENDING" ||
          payment.order.status !== "PAYMENT_PROCESSING" ||
          payment.checkout.status !== "PAYMENT_PROCESSING" ||
          payment.checkout.expiresAt <= now ||
          payment.checkout.reservations.length === 0 ||
          payment.checkout.reservations.some((reservation) => reservation.status !== "ACTIVE")
        ) {
          throw new HttpError(409, "Ödeme artık tamamlanamaz.", "PAYMENT_NOT_COMPLETABLE");
        }

        await transaction.paymentAttempt.create({
          data: {
            paymentId: payment.id,
            idempotencyKey: input.idempotencyKey,
            requestHash: hash,
            outcome: input.outcome,
            actorUserId: input.actorUserId,
          },
        });
        const paymentClaim = await transaction.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: {
            status: decision.paymentStatus,
            paidAt: decision.paymentStatus === "SUCCEEDED" ? now : null,
            failedAt: decision.paymentStatus === "SUCCEEDED" ? null : now,
            failureCode: decision.failureCode,
          },
        });
        if (paymentClaim.count !== 1) {
          throw new HttpError(409, "Ödeme başka bir işlemde tamamlandı.", "PAYMENT_CONFLICT");
        }

        if (decision.reservation === "CONSUME") {
          const orderClaim = await transaction.order.updateMany({
            where: { id: payment.orderId, status: "PAYMENT_PROCESSING" },
            data: { status: "PAID" },
          });
          const checkoutClaim = await transaction.checkout.updateMany({
            where: { id: payment.checkoutId, status: "PAYMENT_PROCESSING" },
            data: { status: "COMPLETED" },
          });
          if (orderClaim.count !== 1 || checkoutClaim.count !== 1) {
            throw new HttpError(
              409,
              "Sipariş durumu başka bir işlemde değişti.",
              "PAYMENT_CONFLICT",
            );
          }
          for (const reservation of payment.checkout.reservations) {
            const reservationClaim = await transaction.stockReservation.updateMany({
              where: { id: reservation.id, status: "ACTIVE" },
              data: { status: "CONSUMED", consumedAt: now },
            });
            if (reservationClaim.count !== 1) {
              throw new HttpError(409, "Stok rezervasyonu değişti.", "RESERVATION_CONFLICT");
            }
            const inventoryRows = await transaction.$queryRaw<
              Array<{ reservedAfter: number; onHand: number; safetyStock: number }>
            >(Prisma.sql`
              UPDATE "inventories"
              SET "on_hand" = "on_hand" - ${reservation.quantity},
                  "reserved" = "reserved" - ${reservation.quantity},
                  "version" = "version" + 1,
                  "updated_at" = ${now}
              WHERE "id" = ${reservation.inventoryId}
                AND "on_hand" >= ${reservation.quantity}
                AND "reserved" >= ${reservation.quantity}
              RETURNING "reserved" AS "reservedAfter", "on_hand" AS "onHand",
                        "safety_stock" AS "safetyStock"
            `);
            if (inventoryRows.length !== 1) {
              throw new HttpError(409, "Stok satışa dönüştürülemedi.", "INVENTORY_CONFLICT");
            }
            await transaction.inventoryMovement.create({
              data: {
                inventoryId: reservation.inventoryId,
                type: "SALE",
                quantityDelta: -reservation.quantity,
                balanceAfter: inventoryRows[0]!.onHand,
                safetyStockAfter: inventoryRows[0]!.safetyStock,
                reservedDelta: -reservation.quantity,
                reservedAfter: inventoryRows[0]!.reservedAfter,
                referenceType: "Order",
                referenceId: payment.orderId,
                reason: "Mock ödeme başarılı sipariş stok düşümü",
                actorUserId: input.actorUserId,
              },
            });
          }
          await transaction.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              fromStatus: "PAYMENT_PROCESSING",
              toStatus: "PAID",
              reasonCode: provider === "MOCK" ? "mock_payment_succeeded" : "bank_transfer_approved",
              actorType: "USER",
              actorId: input.actorUserId,
              metadata: { paymentId: payment.id },
            },
          });
        } else {
          const released = await releaseCheckoutInTransaction(
            transaction,
            payment.checkoutId,
            now,
            input.actorUserId,
            input.requestId,
            input.network,
            true,
          );
          if (!released) {
            throw new HttpError(409, "Rezervasyon serbest bırakılamadı.", "RESERVATION_CONFLICT");
          }
        }

        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.buyerOrganizationId,
            action:
              decision.paymentStatus === "SUCCEEDED"
                ? provider === "MOCK"
                  ? "payment.mock_succeeded"
                  : "payment.bank_transfer_approved"
                : provider === "MOCK"
                  ? "payment.mock_failed"
                  : "payment.bank_transfer_rejected",
            targetType: "Payment",
            targetId: payment.id,
            before: { status: "PENDING" },
            after: {
              status: decision.paymentStatus,
              orderStatus: decision.orderStatus,
              reservation: decision.reservation,
            },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return transaction.payment.findUniqueOrThrow({
          where: { id: payment.id },
          include: paymentInclude,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await existingCompletion(
        input.buyerOrganizationId,
        input.orderId,
        input.paymentId,
        input.idempotencyKey,
        hash,
        provider,
      );
      if (replay) return replay;
      throw new HttpError(409, "Ödeme zaten tamamlanmış.", "PAYMENT_ALREADY_COMPLETED");
    }
    if (isTransactionConflict(error)) {
      throw new HttpError(
        409,
        "Ödeme eşzamanlı işlem nedeniyle tamamlanamadı.",
        "PAYMENT_CONFLICT",
      );
    }
    throw error;
  }
}
