import "server-only";

import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import {
  supplierOrderDecisionResult,
  type SupplierOrderDecision,
} from "@/modules/orders/domain/supplier-order-rules";

type RequestEvidence = {
  supplierOrganizationId: string;
  orderId: string;
  decision: SupplierOrderDecision;
  actorUserId: string;
  requestId: string;
  network?: string;
};

function conflictFor(status: string): HttpError {
  return new HttpError(
    409,
    `Sipariş ${status} durumundayken tedarikçi kararı verilemez.`,
    "INVALID_SUPPLIER_ORDER_TRANSITION",
  );
}

export async function decideSupplierOrder(input: RequestEvidence) {
  return database.$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: input.orderId, supplierOrganizationId: input.supplierOrganizationId },
      select: { id: true, status: true },
    });
    if (!order) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");

    const initialResult = supplierOrderDecisionResult(order.status, input.decision);
    if (initialResult === "REPLAY") return { id: order.id, status: order.status };
    if (initialResult === "CONFLICT") throw conflictFor(order.status);

    const claimed = await transaction.order.updateMany({
      where: {
        id: order.id,
        supplierOrganizationId: input.supplierOrganizationId,
        status: "PAID",
      },
      data: { status: input.decision },
    });
    if (claimed.count !== 1) {
      const current = await transaction.order.findFirst({
        where: { id: order.id, supplierOrganizationId: input.supplierOrganizationId },
        select: { id: true, status: true },
      });
      if (!current) throw new HttpError(404, "Sipariş bulunamadı.", "ORDER_NOT_FOUND");
      if (supplierOrderDecisionResult(current.status, input.decision) === "REPLAY") {
        return { id: current.id, status: current.status };
      }
      throw conflictFor(current.status);
    }

    const reasonCode =
      input.decision === "ACCEPTED" ? "supplier_order_accepted" : "supplier_order_rejected";
    const action =
      input.decision === "ACCEPTED" ? "order.supplier_accepted" : "order.supplier_rejected";
    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: "PAID",
        toStatus: input.decision,
        reasonCode,
        actorType: "USER",
        actorId: input.actorUserId,
        metadata: { supplierOrganizationId: input.supplierOrganizationId },
      },
    });
    await transaction.auditLog.create({
      data: buildAuditLogData({
        actorId: input.actorUserId,
        organizationId: input.supplierOrganizationId,
        action,
        targetType: "Order",
        targetId: order.id,
        before: { status: "PAID" },
        after: { status: input.decision },
        requestId: input.requestId,
        ...(input.network ? { network: input.network } : {}),
      }),
    });
    return { id: order.id, status: input.decision };
  });
}
