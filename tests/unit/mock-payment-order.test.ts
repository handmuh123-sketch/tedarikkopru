import { describe, expect, it } from "vitest";

import { createPublicOrderNumber } from "@/modules/orders/domain/order-number";
import { mockPaymentDecision } from "@/modules/payments/domain/mock-payment-rules";

describe("Faz 3B-1 mock ödeme ve sipariş kuralları", () => {
  it("sipariş numarasını tarih ve sabit uzunluklu entropiyle üretir", () => {
    expect(createPublicOrderNumber(new Date("2026-07-20T17:00:00.000Z"), "A1B2C3D4")).toBe(
      "TK-20260720-A1B2C3D4",
    );
    expect(() => createPublicOrderNumber(new Date(), "unsafe")).toThrow(/entropisi/);
  });

  it("başarılı ödeme rezervasyonu satışa dönüştürür", () => {
    expect(mockPaymentDecision("SUCCEEDED")).toEqual({
      paymentStatus: "SUCCEEDED",
      orderStatus: "PAID",
      checkoutStatus: "COMPLETED",
      reservation: "CONSUME",
      failureCode: null,
    });
  });

  it("ret ve iptal rezervasyonu terminal olarak serbest bırakır", () => {
    expect(mockPaymentDecision("DECLINED")).toMatchObject({
      paymentStatus: "FAILED",
      orderStatus: "CANCELLED",
      reservation: "RELEASE",
      failureCode: "MOCK_DECLINED",
    });
    expect(mockPaymentDecision("CANCELLED")).toMatchObject({
      paymentStatus: "CANCELLED",
      orderStatus: "CANCELLED",
      reservation: "RELEASE",
      failureCode: "MOCK_CANCELLED",
    });
  });
});
