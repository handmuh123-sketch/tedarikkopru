import { createHash } from "node:crypto";

import type { CanonicalMarketplaceValidationResult, MarketplaceValidationIssue } from "./types";

export function validationIssue(
  field: string,
  code: string,
  message: string,
): MarketplaceValidationIssue {
  return { field, code, message };
}

export function validationResult(
  errors: MarketplaceValidationIssue[] = [],
  warnings: MarketplaceValidationIssue[] = [],
): CanonicalMarketplaceValidationResult {
  return { valid: errors.length === 0, errors, warnings };
}

export function minorToMarketplaceDecimal(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
    throw new Error("Tutar güvenli bir minor-unit tam sayısı olmalıdır.");
  return Number((amountMinor / 100).toFixed(2));
}

export function stableMarketplaceRequestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function mockBatchRequestId(value: unknown): string {
  return `MOCK-${stableMarketplaceRequestHash(value).slice(0, 20).toUpperCase()}`;
}
