import type { ProductStatus } from "@/generated/prisma/enums";

const allowedTransitions: Record<ProductStatus, ReadonlySet<ProductStatus>> = {
  DRAFT: new Set(["PENDING_REVIEW"]),
  PENDING_REVIEW: new Set(["ACTIVE", "REJECTED"]),
  ACTIVE: new Set(["DRAFT", "PAUSED", "ARCHIVED"]),
  PAUSED: new Set(["DRAFT", "ACTIVE", "ARCHIVED"]),
  REJECTED: new Set(["DRAFT", "PENDING_REVIEW"]),
  ARCHIVED: new Set(),
};

export function canTransitionProduct(from: ProductStatus, to: ProductStatus): boolean {
  return allowedTransitions[from].has(to);
}

export function isValidOrderQuantity(quantity: number, moq: number, step: number): boolean {
  return (
    Number.isSafeInteger(quantity) &&
    Number.isSafeInteger(moq) &&
    Number.isSafeInteger(step) &&
    moq > 0 &&
    step > 0 &&
    quantity >= moq &&
    (quantity - moq) % step === 0
  );
}

export function formatTryMinor(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new Error("Geçersiz tutar.");
  const whole = Math.trunc(amountMinor / 100).toLocaleString("tr-TR");
  const fraction = String(amountMinor % 100).padStart(2, "0");
  return `${whole},${fraction} TL`;
}
