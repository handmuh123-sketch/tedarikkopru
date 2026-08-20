import { z } from "zod";

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

const carrierPattern = /^[\p{L}\p{N}][\p{L}\p{N} .,'&()/-]*$/u;
const trackingNumberPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export const createShipmentSchema = z
  .object({
    carrier: z.string().trim().min(2).max(120).regex(carrierPattern),
    trackingNumber: z.string().trim().min(4).max(120).regex(trackingNumberPattern),
    shippedAt: z.coerce.date(),
    estimatedDeliveryAt: z.coerce.date().optional(),
  })
  .strict();

export const deliverShipmentSchema = z.object({}).strict();
