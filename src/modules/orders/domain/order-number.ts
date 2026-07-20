import { randomBytes } from "node:crypto";

const ORDER_NUMBER_ENTROPY = /^[A-F0-9]{8}$/;

export function createPublicOrderNumber(
  now: Date,
  entropy = randomBytes(4).toString("hex").toUpperCase(),
): string {
  if (!ORDER_NUMBER_ENTROPY.test(entropy)) {
    throw new Error("Sipariş numarası entropisi geçersiz.");
  }
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `TK-${day}-${entropy}`;
}
