import { describe, expect, it } from "vitest";

import {
  calculateLineAmounts,
  isValidOrderQuantity,
  meetsMinimumOrder,
  sumOrderAmounts,
} from "@/modules/orders/domain/cart-rules";

describe("Faz 3A sepet ve para kuralları", () => {
  it("MOQ ve quantity step'i MOQ tabanından doğrular", () => {
    expect(isValidOrderQuantity(10, 10, 5)).toBe(true);
    expect(isValidOrderQuantity(15, 10, 5)).toBe(true);
    expect(isValidOrderQuantity(5, 10, 5)).toBe(false);
    expect(isValidOrderQuantity(12, 10, 5)).toBe(false);
  });

  it("minor-unit tutarları BigInt ile deterministik yuvarlar", () => {
    expect(calculateLineAmounts(101, 3, 2_000)).toEqual({
      subtotalAmountMinor: 303,
      vatAmountMinor: 61,
      totalAmountMinor: 364,
    });
    expect(
      sumOrderAmounts([calculateLineAmounts(101, 3, 2_000), calculateLineAmounts(250, 2, 1_000)]),
    ).toEqual({ subtotalAmountMinor: 803, vatAmountMinor: 111, totalAmountMinor: 914 });
  });

  it("veritabanı integer sınırını ve minimum siparişi korur", () => {
    expect(meetsMinimumOrder(50_000, 50_000)).toBe(true);
    expect(meetsMinimumOrder(49_999, 50_000)).toBe(false);
    expect(() => calculateLineAmounts(2_000_000_000, 2, 2_000)).toThrow(/güvenli aralığın/);
  });
});
