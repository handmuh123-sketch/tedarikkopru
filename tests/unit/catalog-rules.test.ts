import { describe, expect, it } from "vitest";
import { productWriteSchema } from "@/modules/catalog/application/schemas";
import {
  canTransitionProduct,
  formatTryMinor,
  isValidOrderQuantity,
} from "@/modules/catalog/domain/product-rules";

const productInput = {
  categoryId: "category-id",
  brandId: "brand-id",
  title: "Pilot USB-C Kablo",
  slug: "pilot-usb-c-kablo",
  shortDescription: "Pilot için güçlü ve dayanıklı USB-C kablo.",
  description: "Doğrulanmış tedarikçi tarafından sunulan hızlı şarj destekli pilot kablo ürünü.",
  originCountry: "TR",
  vatRateBasisPoints: 2000,
  warrantyMonths: 24,
  handlingDays: 2,
  variant: {
    sku: "PILOT-CABLE-01",
    title: "Standart",
    packageQuantity: 1,
    moq: 10,
    quantityStep: 5,
    priceAmountMinor: 12990,
  },
};

describe("Faz 2A katalog kuralları", () => {
  it("fiyatı integer minor unit, MOQ ve quantity step pozitif olarak doğrular", () => {
    expect(productWriteSchema.safeParse(productInput).success).toBe(true);
    expect(
      productWriteSchema.safeParse({
        ...productInput,
        variant: { ...productInput.variant, priceAmountMinor: 12.9 },
      }).success,
    ).toBe(false);
    expect(
      productWriteSchema.safeParse({
        ...productInput,
        variant: { ...productInput.variant, moq: 0 },
      }).success,
    ).toBe(false);
    expect(isValidOrderQuantity(10, 10, 5)).toBe(true);
    expect(isValidOrderQuantity(15, 10, 5)).toBe(true);
    expect(isValidOrderQuantity(12, 10, 5)).toBe(false);
    expect(formatTryMinor(12990)).toBe("129,90 TL");
  });

  it("ürün moderasyon geçişlerini deny-by-default uygular", () => {
    expect(canTransitionProduct("DRAFT", "PENDING_REVIEW")).toBe(true);
    expect(canTransitionProduct("PENDING_REVIEW", "ACTIVE")).toBe(true);
    expect(canTransitionProduct("PENDING_REVIEW", "REJECTED")).toBe(true);
    expect(canTransitionProduct("DRAFT", "ACTIVE")).toBe(false);
    expect(canTransitionProduct("ACTIVE", "REJECTED")).toBe(false);
    expect(canTransitionProduct("ARCHIVED", "DRAFT")).toBe(false);
  });
});
