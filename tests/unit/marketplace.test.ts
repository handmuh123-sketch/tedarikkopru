import { describe, expect, it } from "vitest";

import { NotImplementedMarketplaceAdapter } from "@/modules/marketplace/adapters/not-implemented-adapter";
import { TrendyolMarketplaceAdapter } from "@/modules/marketplace/adapters/trendyol-adapter";
import { buildFavoriteProductsXml } from "@/modules/marketplace/application/favorites-xml";
import { minorToMarketplaceDecimal } from "@/modules/marketplace/domain/marketplace-rules";
import type {
  CanonicalMarketplaceProduct,
  MarketplaceChannelAdapter,
} from "@/modules/marketplace/domain/types";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";
import { redactAuditValue } from "@/modules/audit/audit-service";

function product(
  overrides: Partial<CanonicalMarketplaceProduct> = {},
): CanonicalMarketplaceProduct {
  return {
    productId: "product-main-id",
    slug: "pilot-kablo",
    title: "Pilot USB-C Kablo",
    description: "Trendyol aktarımında kullanılacak yeterince ayrıntılı ürün açıklaması.",
    shortDescription: "Pilot ürün açıklaması.",
    category: { id: "category-id", name: "Kablolar", path: "telefon/kablolar" },
    brand: { id: "brand-id", name: "KöprüTech" },
    supplier: { organizationId: "supplier-id", tradeName: "Demo Tedarik" },
    originCountry: "TR",
    vatRateBasisPoints: 2000,
    attributes: { renk: "Siyah" },
    images: ["https://cdn.example.test/products/cable.jpg"],
    variants: [
      {
        variantId: "variant-id",
        sku: "PILOT-CABLE-1",
        barcode: "8680000000012",
        title: "Standart",
        priceMinor: 12_990,
        currency: "TRY",
        availableStock: 32,
        moq: 5,
        quantityStep: 5,
      },
    ],
    ...overrides,
  };
}

const mapping = {
  externalCategoryId: "123",
  externalBrandId: "456",
  attributes: [{ sourceAttributeKey: "renk", externalAttributeId: "789", externalValueId: null }],
};

function expectAdapterContract(adapter: MarketplaceChannelAdapter) {
  expect(adapter.channel).toBeTruthy();
  expect(typeof adapter.mapProduct).toBe("function");
  expect(typeof adapter.validateProduct).toBe("function");
  expect(typeof adapter.publishProducts).toBe("function");
  expect(typeof adapter.updatePriceAndInventory).toBe("function");
  expect(typeof adapter.getPublishStatus).toBe("function");
  expect(typeof adapter.normalizeProviderError).toBe("function");
}

describe("Faz 7A marketplace canonical mapping", () => {
  it("canonical ürünü Trendyol V2 payloadına integer minor-unit fiyat ve available stock ile dönüştürür", () => {
    const adapter = new TrendyolMarketplaceAdapter();
    const mapped = adapter.mapProduct(product(), mapping);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      productId: "product-main-id",
      variantId: "variant-id",
      validation: { valid: true },
      payload: {
        categoryId: 123,
        brandId: 456,
        barcode: "8680000000012",
        quantity: 32,
        stockCode: "PILOT-CABLE-1",
        salePrice: 129.9,
        listPrice: 129.9,
        vatRate: 20,
      },
    });
    expect(minorToMarketplaceDecimal(12_990)).toBe(129.9);
    expect(availableStock(48, 6, 4)).toBe(38);
  });

  it("zorunlu mapping, görsel ve barkod eksiklerini provider çağrısı öncesi bildirir", () => {
    const adapter = new TrendyolMarketplaceAdapter();
    const mapped = adapter.mapProduct(
      product({ images: [], variants: [{ ...product().variants[0]!, barcode: "hatalı barkod" }] }),
      { externalCategoryId: null, externalBrandId: null, attributes: [] },
    )[0]!;
    expect(mapped.validation.valid).toBe(false);
    expect(mapped.payload).toBeNull();
    expect(mapped.validation.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CATEGORY_MAPPING_MISSING",
        "BRAND_MAPPING_MISSING",
        "PUBLIC_IMAGE_REQUIRED",
        "ATTRIBUTE_MAPPING_MISSING",
        "BARCODE_INVALID",
      ]),
    );
  });

  it("genel XML export özel karakterleri escape eder ve raw credential audit payloadına girmez", () => {
    const xml = buildFavoriteProductsXml([product({ title: 'Kablo <&> "özel"' })]);
    expect(xml).toContain("Kablo &lt;&amp;&gt; &quot;özel&quot;");
    expect(
      redactAuditValue({ credentialCiphertext: "plaintext-secret", apiSecret: "api-secret" }),
    ).toEqual({ credentialCiphertext: "[REDACTED]", apiSecret: "[REDACTED]" });
  });

  it("Trendyol hata normalize eder ve provider skeletonları aynı contractı taşır", async () => {
    const trendyol = new TrendyolMarketplaceAdapter();
    expect(trendyol.normalizeProviderError(new Response(null, { status: 429 }))).toMatchObject({
      code: "RATE_LIMITED",
    });
    for (const adapter of [
      trendyol,
      new NotImplementedMarketplaceAdapter("HEPSIBURADA"),
      new NotImplementedMarketplaceAdapter("AMAZON_TR"),
    ]) {
      expectAdapterContract(adapter);
    }
    expect(
      await new NotImplementedMarketplaceAdapter("HEPSIBURADA").validateConnection(null),
    ).toMatchObject({ valid: false, code: "NOT_IMPLEMENTED" });
  });
});
