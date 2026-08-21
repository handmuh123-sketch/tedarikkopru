import { z } from "zod";

import { mockPaymentOutcomes } from "@/modules/payments/domain/mock-payment-rules";

export const mockPaymentCompletionSchema = z.object({
  paymentId: z.string().cuid(),
  outcome: z.enum(mockPaymentOutcomes),
});

export const bankTransferStartSchema = z.object({
  note: z.string().trim().min(3).max(500).optional(),
});

export const bankTransferDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
});
