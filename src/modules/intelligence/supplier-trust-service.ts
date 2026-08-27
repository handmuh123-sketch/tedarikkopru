import "server-only";

import { database } from "@/lib/db/client";

import { calculateSupplierTrust, type SupplierTrustScore } from "./supplier-trust";

export async function getSupplierTrustScore(
  supplierOrganizationId: string,
): Promise<SupplierTrustScore> {
  const orders = await database.order.findMany({
    where: { supplierOrganizationId },
    select: {
      status: true,
      shipment: {
        select: {
          status: true,
          shippedAt: true,
          estimatedDeliveryAt: true,
          deliveredAt: true,
        },
      },
      returnRequests: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
  return calculateSupplierTrust(orders);
}

export async function getSupplierTrustScores(
  supplierOrganizationIds: readonly string[],
): Promise<Map<string, SupplierTrustScore>> {
  const uniqueIds = [...new Set(supplierOrganizationIds)];
  if (uniqueIds.length === 0) return new Map();

  const orders = await database.order.findMany({
    where: { supplierOrganizationId: { in: uniqueIds } },
    select: {
      supplierOrganizationId: true,
      status: true,
      shipment: {
        select: {
          status: true,
          shippedAt: true,
          estimatedDeliveryAt: true,
          deliveredAt: true,
        },
      },
      returnRequests: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(1000, Math.max(120, uniqueIds.length * 120)),
  });

  const grouped = new Map<string, typeof orders>();
  for (const order of orders) {
    const list = grouped.get(order.supplierOrganizationId) ?? [];
    if (list.length < 120) list.push(order);
    grouped.set(order.supplierOrganizationId, list);
  }

  return new Map(
    uniqueIds.map((id) => [id, calculateSupplierTrust(grouped.get(id) ?? [])] as const),
  );
}
