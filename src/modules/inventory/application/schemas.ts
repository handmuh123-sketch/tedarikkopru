import { z } from "zod";

export const inventoryAdjustmentSchema = z.object({
  onHand: z.number().int().min(0).max(2_000_000_000),
  safetyStock: z.number().int().min(0).max(2_000_000_000),
  version: z.number().int().min(0).max(2_000_000_000),
  reason: z.string().trim().min(3).max(240),
});
