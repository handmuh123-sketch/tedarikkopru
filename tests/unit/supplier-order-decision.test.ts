import { describe, expect, it } from "vitest";

import { supplierOrderDecisionResult } from "@/modules/orders/domain/supplier-order-rules";

describe("Faz 3B-2 tedarikçi sipariş kararı", () => {
  it("PAID siparişi kabul veya ret için uygun görür", () => {
    expect(supplierOrderDecisionResult("PAID", "ACCEPTED")).toBe("APPLY");
    expect(supplierOrderDecisionResult("PAID", "REJECTED")).toBe("APPLY");
  });

  it("aynı terminal kararı history oluşturmadan tekrarlar", () => {
    expect(supplierOrderDecisionResult("ACCEPTED", "ACCEPTED")).toBe("REPLAY");
    expect(supplierOrderDecisionResult("REJECTED", "REJECTED")).toBe("REPLAY");
  });

  it("zıt veya PAID öncesi kararı reddeder", () => {
    expect(supplierOrderDecisionResult("ACCEPTED", "REJECTED")).toBe("CONFLICT");
    expect(supplierOrderDecisionResult("PAYMENT_PROCESSING", "ACCEPTED")).toBe("CONFLICT");
  });
});
