import type { OrderStatus, ReturnRequestStatus } from "@/generated/prisma/enums";

export const returnDecisions = ["ACCEPTED", "REJECTED"] as const;

export type ReturnDecision = (typeof returnDecisions)[number];
export type ReturnTransitionResult = "APPLY" | "REPLAY" | "CONFLICT";

export function returnCreateResult(orderStatus: OrderStatus): ReturnTransitionResult {
  return orderStatus === "DELIVERED" ? "APPLY" : "CONFLICT";
}

export function returnDecisionResult(
  status: ReturnRequestStatus,
  decision: ReturnDecision,
): ReturnTransitionResult {
  if (status === decision) return "REPLAY";
  return status === "REQUESTED" ? "APPLY" : "CONFLICT";
}

export function returnReceiptResult(status: ReturnRequestStatus): ReturnTransitionResult {
  if (status === "RETURN_RECEIVED") return "REPLAY";
  return status === "ACCEPTED" ? "APPLY" : "CONFLICT";
}
