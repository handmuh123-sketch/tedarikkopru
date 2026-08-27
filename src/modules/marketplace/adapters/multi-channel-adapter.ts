import type {
  CanonicalMarketplaceProduct,
  CanonicalMarketplaceValidationResult,
  MarketplaceChannel,
  MarketplaceChannelAdapter,
  MarketplaceConnectionCredentials,
  MarketplaceConnectionHealth,
  MarketplaceMappedProduct,
  MarketplaceProductMapping,
  MarketplacePublishResult,
  MarketplaceValidationIssue,
} from "../domain/types";
import { validationIssue, validationResult } from "../domain/marketplace-rules";

function correlationId(): string {
  return `tk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function liveHealthCheck(
  channel: MarketplaceChannel,
  credentials: MarketplaceConnectionCredentials,
): Promise<MarketplaceConnectionHealth> {
  try {
    if (channel === "PTTAVM") {
      const response = await fetch("https://integration-api.pttavm.com/api/v1/categories/main", {
        headers: {
          Accept: "application/json",
          "Api-Key": credentials.apiKey,
          "Access-Token": credentials.apiSecret,
          "X-Correlation-Id": correlationId(),
        },
        cache: "no-store",
      });
      return response.ok
        ? { valid: true, mode: "LIVE" }
        : { valid: false, mode: "LIVE", code: `PTTAVM_HTTP_${response.status}` };
    }

    if (channel === "HEPSIBURADA") {
      const base =
        credentials.environment === "STAGE"
          ? "https://listing-external-sit.hepsiburada.com"
          : "https://listing-external.hepsiburada.com";
      const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64");
      const response = await fetch(
        `${base}/listings/merchantid/${encodeURIComponent(credentials.sellerId)}?offset=0&limit=1`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            "User-Agent": "TedarikKopru/1.0",
          },
          cache: "no-store",
        },
      );
      return response.ok
        ? { valid: true, mode: "LIVE" }
        : { valid: false, mode: "LIVE", code: `HEPSIBURADA_HTTP_${response.status}` };
    }

    if (channel === "N11") {
      const response = await fetch("https://api.n11.com/ms/product-query?page=0&size=1", {
        headers: {
          Accept: "application/json",
          appkey: credentials.apiKey,
          appsecret: credentials.apiSecret,
        },
        cache: "no-store",
      });
      return response.ok
        ? { valid: true, mode: "LIVE" }
        : { valid: false, mode: "LIVE", code: `N11_HTTP_${response.status}` };
    }

    return { valid: true, mode: "PREVIEW", code: "PROVIDER_APPROVAL_REQUIRED" };
  } catch {
    return { valid: false, mode: "LIVE", code: `${channel}_CONNECTION_FAILED` };
  }
}

export class MultiChannelMarketplaceAdapter implements MarketplaceChannelAdapter {
  constructor(readonly channel: Exclude<MarketplaceChannel, "TRENDYOL">) {}

  async validateConnection(
    credentials: MarketplaceConnectionCredentials | null,
  ): Promise<MarketplaceConnectionHealth> {
    if (!credentials?.sellerId || !credentials.apiKey || !credentials.apiSecret) {
      return { valid: false, mode: "PREVIEW", code: "CREDENTIALS_REQUIRED" };
    }
    return liveHealthCheck(this.channel, credentials);
  }

  validateProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): CanonicalMarketplaceValidationResult {
    const errors: MarketplaceValidationIssue[] = [];
    const warnings: MarketplaceValidationIssue[] = [];

    if (!mapping.externalCategoryId) {
      errors.push(
        validationIssue("category", "CATEGORY_MAPPING_REQUIRED", "Pazaryeri kategori eşlemesi gerekli."),
      );
    }
    if (!product.images.length) {
      errors.push(validationIssue("images", "IMAGE_REQUIRED", "En az bir ürün görseli gerekli."));
    }
    if (!product.brand.name) {
      errors.push(validationIssue("brand", "BRAND_REQUIRED", "Ürün markası gerekli."));
    }
    if (!mapping.externalBrandId) {
      warnings.push(
        validationIssue(
          "brand",
          "BRAND_MAPPING_RECOMMENDED",
          "Kanal marka eşlemesi henüz yapılmadı; aktarım öncesi kontrol edilmelidir.",
        ),
      );
    }
    if (product.variants.some((variant) => !variant.barcode)) {
      errors.push(validationIssue("barcode", "BARCODE_REQUIRED", "Tüm varyantlarda barkod gerekli."));
    }

    return validationResult(errors, warnings);
  }

  mapProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): MarketplaceMappedProduct[] {
    const validation = this.validateProduct(product, mapping);
    return product.variants.map((variant) => ({
      productId: product.productId,
      variantId: variant.variantId,
      validation,
      payload: {
        channel: this.channel,
        productId: product.productId,
        sku: variant.sku,
        barcode: variant.barcode,
        title: product.title,
        description: product.description,
        categoryId: mapping.externalCategoryId,
        brandId: mapping.externalBrandId,
        brand: product.brand.name,
        attributes: mapping.attributes,
        images: product.images,
        price: variant.priceMinor / 100,
        currency: variant.currency,
        quantity: variant.availableStock,
        vatRate: product.vatRateBasisPoints / 100,
        originCountry: product.originCountry,
      },
    }));
  }

  async publishProducts(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    void credentials;
    void products;
    return {
      success: false,
      mode: "PREVIEW",
      batchRequestId: null,
      errors: [
        validationIssue(
          "channel",
          "LIVE_PUBLISH_REQUIRES_PROVIDER_APPROVAL",
          `${this.channel} canlı ürün gönderimi için mağaza API yetkisi ve sağlayıcı onayı gerekir.`,
        ),
      ],
      warnings: [],
    };
  }

  async updatePriceAndInventory(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    return this.publishProducts(credentials, products);
  }

  async getPublishStatus(
    credentials: MarketplaceConnectionCredentials,
    batchRequestId: string,
  ): Promise<MarketplacePublishResult> {
    void credentials;
    return {
      success: false,
      mode: "PREVIEW",
      batchRequestId,
      errors: [
        validationIssue(
          "channel",
          "LIVE_STATUS_REQUIRES_PROVIDER_APPROVAL",
          `${this.channel} canlı durum sorgusu sağlayıcı yetkisi açıldıktan sonra kullanılabilir.`,
        ),
      ],
      warnings: [],
    };
  }

  normalizeProviderError(error: unknown): MarketplaceValidationIssue {
    const message = error instanceof Error ? error.message : "Pazaryeri isteği başarısız oldu.";
    return validationIssue("provider", `${this.channel}_PROVIDER_ERROR`, message);
  }
}
