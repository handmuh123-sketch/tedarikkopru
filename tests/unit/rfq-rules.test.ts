import { describe, expect, it } from "vitest";

import {
  isValidRfqQuantity,
  rfqQuoteDecisionResult,
  rfqQuoteOfferResult,
} from "@/modules/rfq/domain/rfq-rules";

describe("Faz 3C RFQ durum kuralları", () => {
  it("MOQ ve miktar adımına uygun talebi kabul eder", () => {
    expect(isValidRfqQuantity(10, 5, 5)).toBe(true);
    expect(isValidRfqQuantity(5, 5, 5)).toBe(true);
    expect(isValidRfqQuantity(6, 5, 5)).toBe(false);
    expect(isValidRfqQuantity(4, 5, 5)).toBe(false);
  });

  it("açık RFQ için tek teklif geçişine izin verir", () => {
    expect(rfqQuoteOfferResult("OPEN")).toBe("APPLY");
    expect(rfqQuoteOfferResult("QUOTED")).toBe("CONFLICT");
    expect(rfqQuoteOfferResult("ACCEPTED")).toBe("CONFLICT");
  });

  it("aynı teklif kararını tekrarlar, zıt veya erken kararı engeller", () => {
    expect(rfqQuoteDecisionResult("QUOTED", "OFFERED", "ACCEPTED")).toBe("APPLY");
    expect(rfqQuoteDecisionResult("QUOTED", "OFFERED", "REJECTED")).toBe("APPLY");
    expect(rfqQuoteDecisionResult("ACCEPTED", "ACCEPTED", "ACCEPTED")).toBe("REPLAY");
    expect(rfqQuoteDecisionResult("REJECTED", "REJECTED", "REJECTED")).toBe("REPLAY");
    expect(rfqQuoteDecisionResult("ACCEPTED", "ACCEPTED", "REJECTED")).toBe("CONFLICT");
    expect(rfqQuoteDecisionResult("OPEN", "OFFERED", "ACCEPTED")).toBe("CONFLICT");
  });
});
