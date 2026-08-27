import { describe, expect, it } from "vitest";

import { calculateProductOpportunity } from "@/modules/intelligence/opportunity-score";

describe("product opportunity score", () => {
  it("rewards low MOQ, fast handling, strong stock and marketplace readiness", () => {
    const result = calculateProductOpportunity({
      priceAmountMinor: 12900,
      moq: 1,
      availableStock: 120,
      handlingDays: 1,
      hasImage: true,
      hasBarcode: true,
      verifiedSupplier: true,
      warrantyMonths: 24,
      categoryChannels: ["TRENDYOL", "HEPSIBURADA", "N11"],
      brandChannels: ["TRENDYOL", "HEPSIBURADA", "N11"],
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.readyChannels).toEqual(["TRENDYOL", "HEPSIBURADA", "N11"]);
    expect(result.reasons).toContain("Düşük minimum sipariş");
    expect(result.reasons).toContain("Hızlı hazırlık");
  });

  it("does not mark a channel ready when barcode or mapping is missing", () => {
    const result = calculateProductOpportunity({
      priceAmountMinor: 50000,
      moq: 20,
      availableStock: 10,
      handlingDays: 7,
      hasImage: true,
      hasBarcode: false,
      verifiedSupplier: true,
      categoryChannels: ["TRENDYOL"],
      brandChannels: ["TRENDYOL"],
    });

    expect(result.readyChannelCount).toBe(0);
    expect(result.score).toBeLessThan(62);
  });

  it("uses only the intersection of category and brand mappings", () => {
    const result = calculateProductOpportunity({
      priceAmountMinor: 25000,
      moq: 2,
      availableStock: 40,
      handlingDays: 2,
      hasImage: true,
      hasBarcode: true,
      verifiedSupplier: true,
      categoryChannels: ["TRENDYOL", "N11"],
      brandChannels: ["TRENDYOL", "PAZARAMA"],
    });

    expect(result.readyChannels).toEqual(["TRENDYOL"]);
  });
});
