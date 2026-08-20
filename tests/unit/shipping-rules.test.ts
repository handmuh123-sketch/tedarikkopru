import { describe, expect, it } from "vitest";

import {
  shipmentCreateResult,
  shipmentDeliveryResult,
} from "@/modules/shipping/domain/shipping-rules";

describe("Faz 4A kargo durum kuralları", () => {
  it("yalnız kabul edilmiş siparişin kargoya verilmesine izin verir", () => {
    expect(shipmentCreateResult("ACCEPTED")).toBe("APPLY");
    expect(shipmentCreateResult("PAID")).toBe("CONFLICT");
    expect(shipmentCreateResult("SHIPPED")).toBe("CONFLICT");
    expect(shipmentCreateResult("DELIVERED")).toBe("CONFLICT");
  });

  it("yalnız SHIPPED kargoyu teslim eder ve terminal tekrarı ayırt eder", () => {
    expect(shipmentDeliveryResult("SHIPPED", "SHIPPED")).toBe("APPLY");
    expect(shipmentDeliveryResult("DELIVERED", "DELIVERED")).toBe("REPLAY");
    expect(shipmentDeliveryResult("ACCEPTED", "SHIPPED")).toBe("CONFLICT");
    expect(shipmentDeliveryResult("SHIPPED", "DELIVERED")).toBe("CONFLICT");
  });
});
