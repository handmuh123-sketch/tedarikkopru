import type { OrderStatus } from "@/generated/prisma/enums";

export const supplierOrderDecisions = ["ACCEPTED", "REJECTED"] as const;

export type SupplierOrderDecision = (typeof supplierOrderDecisions)[number];
export type SupplierOrderDecisionResult = "APPLY" | "REPLAY" | "CONFLICT";

export function supplierOrderDecisionResult(
  currentStatus: OrderStatus,
  decision: SupplierOrderDecision,
): SupplierOrderDecisionResult {
  if (currentStatus === decision) return "REPLAY";
  if (currentStatus === "PAID") return "APPLY";
  return "CONFLICT";
}
