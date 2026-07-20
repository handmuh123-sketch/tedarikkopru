import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { assertInventoryTarget } from "@/modules/inventory/domain/inventory-rules";

type AdjustmentInput = {
  organizationId: string;
  variantId: string;
  onHand: number;
  safetyStock: number;
  expectedVersion: number;
  reason: string;
  actorUserId: string;
  movementType?: "ADJUSTMENT" | "IMPORT";
  referenceType?: string;
  referenceId?: string;
  requestId: string;
  network?: string;
};

export async function adjustInventoryInTransaction(
  transaction: Prisma.TransactionClient,
  input: AdjustmentInput,
) {
  assertInventoryTarget(input.onHand, input.safetyStock);
  const variant = await transaction.productVariant.findFirst({
    where: {
      id: input.variantId,
      supplierOrganizationId: input.organizationId,
      product: { supplierOrganizationId: input.organizationId, status: { not: "ARCHIVED" } },
    },
    select: { id: true, sku: true, inventory: true },
  });
  if (!variant) throw new HttpError(404, "Ürün varyantı bulunamadı.", "VARIANT_NOT_FOUND");

  const current = variant.inventory;
  if (!current) {
    if (input.expectedVersion !== 0)
      throw new HttpError(409, "Stok kaydı değişti; sayfayı yenileyin.", "INVENTORY_CONFLICT");
    const created = await transaction.inventory.create({
      data: {
        variantId: variant.id,
        supplierOrganizationId: input.organizationId,
        onHand: input.onHand,
        safetyStock: input.safetyStock,
        version: 1,
      },
    });
    await transaction.inventoryMovement.create({
      data: {
        inventoryId: created.id,
        type: input.movementType ?? "ADJUSTMENT",
        quantityDelta: input.onHand,
        balanceAfter: input.onHand,
        safetyStockAfter: input.safetyStock,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        reason: input.reason,
        actorUserId: input.actorUserId,
      },
    });
    await writeInventoryAudit(transaction, input, variant.sku, 0, created.version);
    return created;
  }

  const claimed = await transaction.inventory.updateMany({
    where: {
      id: current.id,
      supplierOrganizationId: input.organizationId,
      version: input.expectedVersion,
    },
    data: {
      onHand: input.onHand,
      safetyStock: input.safetyStock,
      version: { increment: 1 },
    },
  });
  if (claimed.count !== 1)
    throw new HttpError(
      409,
      "Stok başka bir işlemde değişti; sayfayı yenileyin.",
      "INVENTORY_CONFLICT",
    );

  const updated = await transaction.inventory.findUniqueOrThrow({ where: { id: current.id } });
  await transaction.inventoryMovement.create({
    data: {
      inventoryId: current.id,
      type: input.movementType ?? "ADJUSTMENT",
      quantityDelta: input.onHand - current.onHand,
      balanceAfter: input.onHand,
      safetyStockAfter: input.safetyStock,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      reason: input.reason,
      actorUserId: input.actorUserId,
    },
  });
  await writeInventoryAudit(transaction, input, variant.sku, current.version, updated.version);
  return updated;
}

async function writeInventoryAudit(
  transaction: Prisma.TransactionClient,
  input: AdjustmentInput,
  sku: string,
  beforeVersion: number,
  afterVersion: number,
) {
  await transaction.auditLog.create({
    data: buildAuditLogData({
      actorId: input.actorUserId,
      organizationId: input.organizationId,
      action: "inventory.adjusted",
      targetType: "ProductVariant",
      targetId: input.variantId,
      before: { version: beforeVersion },
      after: {
        sku,
        onHand: input.onHand,
        safetyStock: input.safetyStock,
        version: afterVersion,
        reasonProvided: true,
      },
      requestId: input.requestId,
      ...(input.network ? { network: input.network } : {}),
    }),
  });
}

export async function adjustInventory(input: AdjustmentInput) {
  try {
    return await database.$transaction((transaction) =>
      adjustInventoryInTransaction(transaction, input),
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw new HttpError(
        409,
        "Stok başka bir işlemde değişti; tekrar deneyin.",
        "INVENTORY_CONFLICT",
      );
    }
    throw error;
  }
}
