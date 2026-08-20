import { z } from "zod";

export const addCartItemSchema = z.object({
  variantId: z.string().trim().min(1).max(36),
  quantity: z.number().int().min(1).max(100_000),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(100_000),
});

export const checkoutDraftSchema = z.object({
  deliveryAddressId: z.string().trim().min(1).max(36),
  invoiceAddressId: z.string().trim().min(1).max(36),
});

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

export const supplierOrderDecisionSchema = z
  .object({ decision: z.enum(["ACCEPTED", "REJECTED"]) })
  .strict();
