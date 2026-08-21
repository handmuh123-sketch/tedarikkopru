import { z } from "zod";

import { returnDecisions } from "@/modules/returns/domain/return-rules";

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

const returnItemSchema = z.object({
  orderItemId: z.string().trim().min(1).max(36),
  quantity: z.number().int().min(1).max(100_000),
});

export const createReturnSchema = z
  .object({
    reason: z.enum(["DAMAGED", "DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "OTHER"]),
    buyerNote: z.string().trim().min(1).max(1000).optional(),
    items: z.array(returnItemSchema).min(1).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const itemIds = new Set<string>();
    for (const item of value.items) {
      if (itemIds.has(item.orderItemId)) {
        context.addIssue({
          code: "custom",
          message: "Aynı sipariş satırı bir iade talebinde yalnız bir kez yer alabilir.",
          path: ["items"],
        });
      }
      itemIds.add(item.orderItemId);
    }
  });

export const returnDecisionSchema = z
  .object({ decision: z.enum(returnDecisions) })
  .strict();

export const returnReceiptSchema = z.object({}).strict();
