import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import {
  shipmentCreateResult,
  shipmentDeliveryResult,
} from "@/modules/shipping/domain/shipping-rules";

type RequestEvidence = {
  actorUserId: string;
  requestId: string;
  network?: string;
};

type CreateShipmentInput = RequestEvidence & {
  supplierOrganizationId: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: Date;
  estimatedDeliveryAt?: Date;
  idempotencyKey: string;
  now?: Date;
};

type DeliverShipmentInput = RequestEvidence & {
  supplierOrganizationId: string;
  orderId: string;
  idempotencyKey: string;
  now?: Date;
};

const shipmentSelect = {
  id: true,
  orderId: true,
  status: true,
  carrier: true,
  trackingNumber: true,
  shippedAt: true,
  estimatedDeliveryAt: true,
  deliveredAt: true,
} satisfies Prisma.ShipmentSelect;

type ShipmentResult = Prisma.ShipmentGetPayload<{ select: typeof shipmentSelect }>;

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

function shipmentCreateConflict(status: string): HttpError {
  return new HttpError(
    409,
    `Sipariş ${status} durumundayken kargoya verilemez.`,
    "INVALID_SHIPMENT_TRANSITION",
  );
}

function shipmentDeliveryConflict(status: string): HttpError {
  return new HttpError(
    409,
    `Sipariş ${status} durumundayken teslim edildi olarak işaretlenemez.`,
    "INVALID_DELIVERY_TRANSITION",
  );
}

function assertShipmentDates(shippedAt: Date, estimatedDeliveryAt: Date | undefined, now: Date) {
  if (shippedAt > now) {
    throw new HttpError(422, "Kargoya verilme tarihi gelecekte olamaz.", "INVALID_SHIPPED_AT");
  }
  if (estimatedDeliveryAt && estimatedDeliveryAt < shippedAt) {
    throw new HttpError(
      422,
      "Tahmini teslim tarihi kargoya verilme tarihinden önce olamaz.",
      "INVALID_ESTIMATED_DELIVERY_AT",
    );
  }
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

function concurrentUpdateError(): HttpError {
  return new HttpError(
    409,
    "Kargo durumu eşzamanlı olarak değişti. Lütfen tekrar deneyin.",
    "SHIPMENT_CONCURRENT_UPDATE",
  );
}

async function findShippingReplay(
  transaction: Prisma.TransactionClient,
  supplierOrganizationId: string,
  idempotencyKey: string,
  hash: string,
): Promise<ShipmentResult | null> {
  const existing = await transaction.shipment.findUnique({
    where: {
      supplierOrganizationId_shippingIdempotencyKey: {
        supplierOrganizationId,
        shippingIdempotencyKey: idempotencyKey,
      },
    },
    select: { ...shipmentSelect, shippingRequestHash: true },
  });
  if (!existing) return null;
  if (existing.shippingRequestHash !== hash) throw idempotencyConflict();
  return {
    id: existing.id,
    orderId: existing.orderId,
    status: existing.status,
    carrier: existing.carrier,
    trackingNumber: existing.trackingNumber,
    shippedAt: existing.shippedAt,
    estimatedDeliveryAt: existing.estimatedDeliveryAt,
    deliveredAt: existing.deliveredAt,
  };
}

async function findDeliveryReplay(
  transaction: Prisma.TransactionClient,
  supplierOrganizationId: string,
  idempotencyKey: string,
  hash: string,
): Promise<ShipmentResult | null> {
  const existing = await transaction.shipment.findUnique({
    where: {
      supplierOrganizationId_deliveryIdempotencyKey: {
        supplierOrganizationId,
        deliveryIdempotencyKey: idempotencyKey,
      },
    },
    select: { ...shipmentSelect, deliveryRequestHash: true },
  });
  if (!existing) return null;
  if (existing.deliveryRequestHash !== hash) throw idempotencyConflict();
  return {
    id: existing.id,
    orderId: existing.orderId,
    status: existing.status,
    carrier: existing.carrier,
    trackingNumber: existing.trackingNumber,
    shippedAt: existing.shippedAt,
    estimatedDeliveryAt: existing.estimatedDeliveryAt,
    deliveredAt: existing.deliveredAt,
  };
}

export async function createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
  const now = input.now ?? new Date();
  assertShipmentDates(input.shippedAt, input.estimatedDeliveryAt, now);
  const hash = requestHash({
    orderId: input.orderId,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    shippedAt: input.shippedAt.toISOString(),
    estimatedDeliveryAt: input.estimatedDeliveryAt?.toISOString(),
  });

  try {
    return await database.$transaction(
      async (transaction) => {
        const replay = await findShippingReplay(
          transaction,
          input.supplierOrganizationId,
          input.idempotencyKey,
          hash,
        );
        if (replay) return replay;

        const order = await transaction.order.findFirst({
          where: { id: input.orderId, supplierOrganizationId: input.supplierOrganizationId },
          select: { id: true, status: true },
        });
        if (!order) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");

        const existingShipment = await transaction.shipment.findUnique({
          where: { orderId: order.id },
          select: { id: true },
        });
        if (existingShipment) {
          throw new HttpError(
            409,
            "Bu sipariş için kargo zaten oluşturuldu.",
            "SHIPMENT_ALREADY_EXISTS",
          );
        }
        if (shipmentCreateResult(order.status) !== "APPLY") {
          throw shipmentCreateConflict(order.status);
        }

        const claimed = await transaction.order.updateMany({
          where: {
            id: order.id,
            supplierOrganizationId: input.supplierOrganizationId,
            status: "ACCEPTED",
          },
          data: { status: "SHIPPED" },
        });
        if (claimed.count !== 1) {
          const current = await transaction.order.findFirst({
            where: { id: order.id, supplierOrganizationId: input.supplierOrganizationId },
            select: { status: true },
          });
          if (!current) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");
          throw shipmentCreateConflict(current.status);
        }

        const shipment = await transaction.shipment.create({
          data: {
            orderId: order.id,
            supplierOrganizationId: input.supplierOrganizationId,
            status: "SHIPPED",
            carrier: input.carrier,
            trackingNumber: input.trackingNumber,
            shippedAt: input.shippedAt,
            estimatedDeliveryAt: input.estimatedDeliveryAt ?? null,
            shippingIdempotencyKey: input.idempotencyKey,
            shippingRequestHash: hash,
            statusHistory: {
              create: {
                toStatus: "SHIPPED",
                reasonCode: "supplier_shipment_created",
                actorType: "USER",
                actorId: input.actorUserId,
                metadata: { orderId: order.id },
              },
            },
          },
          select: shipmentSelect,
        });
        await transaction.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: "ACCEPTED",
            toStatus: "SHIPPED",
            reasonCode: "supplier_shipment_created",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { shipmentId: shipment.id },
          },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.supplierOrganizationId,
            action: "order.shipped",
            targetType: "Shipment",
            targetId: shipment.id,
            before: { orderStatus: "ACCEPTED" },
            after: {
              orderStatus: "SHIPPED",
              shipmentStatus: "SHIPPED",
              shippedAt: shipment.shippedAt.toISOString(),
            },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return shipment;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await findShippingReplay(
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

export async function markShipmentDelivered(input: DeliverShipmentInput): Promise<ShipmentResult> {
  const now = input.now ?? new Date();
  const hash = requestHash({ orderId: input.orderId });

  try {
    return await database.$transaction(
      async (transaction) => {
        const replay = await findDeliveryReplay(
          transaction,
          input.supplierOrganizationId,
          input.idempotencyKey,
          hash,
        );
        if (replay) return replay;

        const order = await transaction.order.findFirst({
          where: { id: input.orderId, supplierOrganizationId: input.supplierOrganizationId },
          select: {
            id: true,
            status: true,
            shipment: {
              select: { id: true, status: true, shippedAt: true },
            },
          },
        });
        if (!order) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");
        if (!order.shipment) throw new HttpError(404, "Kargo bulunamadı.", "SHIPMENT_NOT_FOUND");

        const result = shipmentDeliveryResult(order.status, order.shipment.status);
        if (result === "REPLAY") {
          return transaction.shipment.findUniqueOrThrow({
            where: { id: order.shipment.id },
            select: shipmentSelect,
          });
        }
        if (result !== "APPLY") throw shipmentDeliveryConflict(order.status);
        if (now < order.shipment.shippedAt) {
          throw new HttpError(
            422,
            "Teslim tarihi kargoya verilme tarihinden önce olamaz.",
            "INVALID_DELIVERED_AT",
          );
        }

        const claimedShipment = await transaction.shipment.updateMany({
          where: { id: order.shipment.id, status: "SHIPPED" },
          data: {
            status: "DELIVERED",
            deliveredAt: now,
            deliveryIdempotencyKey: input.idempotencyKey,
            deliveryRequestHash: hash,
          },
        });
        const claimedOrder = await transaction.order.updateMany({
          where: {
            id: order.id,
            supplierOrganizationId: input.supplierOrganizationId,
            status: "SHIPPED",
          },
          data: { status: "DELIVERED" },
        });
        if (claimedShipment.count !== 1 || claimedOrder.count !== 1) {
          const current = await transaction.order.findFirst({
            where: { id: order.id, supplierOrganizationId: input.supplierOrganizationId },
            select: { status: true, shipment: { select: { status: true } } },
          });
          if (!current?.shipment)
            throw new HttpError(404, "Kargo bulunamadı.", "SHIPMENT_NOT_FOUND");
          if (shipmentDeliveryResult(current.status, current.shipment.status) === "REPLAY") {
            return transaction.shipment.findUniqueOrThrow({
              where: { id: order.shipment.id },
              select: shipmentSelect,
            });
          }
          throw shipmentDeliveryConflict(current.status);
        }

        await transaction.shipmentStatusHistory.create({
          data: {
            shipmentId: order.shipment.id,
            fromStatus: "SHIPPED",
            toStatus: "DELIVERED",
            reasonCode: "supplier_shipment_delivered",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { orderId: order.id },
          },
        });
        await transaction.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: "SHIPPED",
            toStatus: "DELIVERED",
            reasonCode: "supplier_shipment_delivered",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { shipmentId: order.shipment.id },
          },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.supplierOrganizationId,
            action: "order.delivered",
            targetType: "Shipment",
            targetId: order.shipment.id,
            before: { orderStatus: "SHIPPED", shipmentStatus: "SHIPPED" },
            after: {
              orderStatus: "DELIVERED",
              shipmentStatus: "DELIVERED",
              deliveredAt: now.toISOString(),
            },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return transaction.shipment.findUniqueOrThrow({
          where: { id: order.shipment.id },
          select: shipmentSelect,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await findDeliveryReplay(
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
