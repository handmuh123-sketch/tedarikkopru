import { z } from "zod";

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

const optionalNote = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((value) => value || undefined);

export const createRfqSchema = z
  .object({
    variantId: z.string().trim().min(1).max(36),
    targetQuantity: z.number().int().min(1).max(100_000),
    buyerNote: optionalNote,
  })
  .strict();

export const offerQuoteSchema = z
  .object({
    unitPriceAmountMinor: z.number().int().min(1).max(2_147_483_647),
    validUntil: z.coerce.date(),
    supplierNote: optionalNote,
  })
  .strict();

export const quoteDecisionSchema = z
  .object({ decision: z.enum(["ACCEPTED", "REJECTED"]) })
  .strict();
