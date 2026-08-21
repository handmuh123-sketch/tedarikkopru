import { describe, expect, it } from "vitest";

import {
  returnCreateResult,
  returnDecisionResult,
  returnReceiptResult,
} from "@/modules/returns/domain/return-rules";

describe("Faz 4B iade durum kuralları", () => {
  it("yalnız teslim edilmiş sipariş için iade açılmasına izin verir", () => {
    expect(returnCreateResult("DELIVERED")).toBe("APPLY");
    expect(returnCreateResult("SHIPPED")).toBe("CONFLICT");
    expect(returnCreateResult("ACCEPTED")).toBe("CONFLICT");
  });

  it("yalnız bekleyen iade için kabul veya ret kararı verir", () => {
    expect(returnDecisionResult("REQUESTED", "ACCEPTED")).toBe("APPLY");
    expect(returnDecisionResult("REQUESTED", "REJECTED")).toBe("APPLY");
    expect(returnDecisionResult("ACCEPTED", "ACCEPTED")).toBe("REPLAY");
    expect(returnDecisionResult("REJECTED", "REJECTED")).toBe("REPLAY");
    expect(returnDecisionResult("ACCEPTED", "REJECTED")).toBe("CONFLICT");
  });

  it("stok geri koymayı yalnız kabulden sonra ve bir kez uygular", () => {
    expect(returnReceiptResult("ACCEPTED")).toBe("APPLY");
    expect(returnReceiptResult("RETURN_RECEIVED")).toBe("REPLAY");
    expect(returnReceiptResult("REQUESTED")).toBe("CONFLICT");
    expect(returnReceiptResult("REJECTED")).toBe("CONFLICT");
  });
});
