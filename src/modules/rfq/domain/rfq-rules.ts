import type { QuoteStatus, RfqStatus } from "@/generated/prisma/client";

export const rfqQuoteDecisionValues = ["ACCEPTED", "REJECTED"] as const;

export type RfqQuoteDecision = (typeof rfqQuoteDecisionValues)[number];
export type TransitionResult = "APPLY" | "REPLAY" | "CONFLICT";

export function isValidRfqQuantity(quantity: number, moq: number, quantityStep: number): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity >= moq &&
    quantityStep > 0 &&
    (quantity - moq) % quantityStep === 0
  );
}

export function rfqQuoteOfferResult(status: RfqStatus): TransitionResult {
  return status === "OPEN" ? "APPLY" : "CONFLICT";
}

export function rfqQuoteDecisionResult(
  rfqStatus: RfqStatus,
  quoteStatus: QuoteStatus,
  decision: RfqQuoteDecision,
): TransitionResult {
  if (rfqStatus === decision && quoteStatus === decision) return "REPLAY";
  if (rfqStatus === "QUOTED" && quoteStatus === "OFFERED") return "APPLY";
  return "CONFLICT";
}
