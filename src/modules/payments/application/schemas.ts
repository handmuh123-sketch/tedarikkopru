import { z } from "zod";

import { mockPaymentOutcomes } from "@/modules/payments/domain/mock-payment-rules";

export const mockPaymentCompletionSchema = z.object({
  paymentId: z.string().cuid(),
  outcome: z.enum(mockPaymentOutcomes),
});
