import type {
  CanonicalMarketplaceProduct,
  CanonicalMarketplaceValidationResult,
  MarketplaceChannelAdapter,
  MarketplaceConnectionCredentials,
  MarketplaceConnectionHealth,
  MarketplaceMappedProduct,
  MarketplaceProductMapping,
  MarketplacePublishResult,
  MarketplaceValidationIssue,
} from "../domain/types";
import { validationIssue, validationResult } from "../domain/marketplace-rules";

function requestHeaders(credentials: MarketplaceConnectionCredentials): Record<string, string> {
  return {
    Accept: "application/json",
    "Api-Key": credentials.apiKey,
    "Access-Token": credentials.apiSecret,
    "Content-Type": "application/json",
    "X-Correlation-Id": `tk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}

function responseTrackingId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  const candidate = object.trackingId ?? object.trackingid ?? object.tracking_id;
  return typeof candidate === "string" && candidate ? candidate : null;
}

export class PttAvmMarketplaceAdapter implements MarketplaceChannelAdapter {
  readonly channel = "PTTAVM" as const;

  async validateConnection(
    credentials: MarketplaceConnectionCredentials | null,
  ): Promise<MarketplaceConnectionHealth> {
    if (!credentials?.apiKey || !credentials.apiSecret) {
      return { valid: false, mode: "PREVIEW", code: "CREDENTIALS_REQUIRED" };
    }
    try {
      const response = await fetch("https://integration-api.pttavm.com/api/v1/categories/main", {
        headers: requestHeaders(credentials),
        cache: "no-store",
      });
      return response.ok
        ? { valid: true, mode: "LIVE" }
        : { valid: false, mode: "LIVE", code: `PTTAVM_HTTP_${response.status}` };
    } catch {
      return { valid: false, mode: "LIVE", code: "PTTAVM_CONNECTION_FAILED" };
    }
  }

  validateProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): CanonicalMarketplaceValidationResult {
    const errors: MarketplaceValidationIssue[] = [];
    if (!mapping.externalCategoryId) {
      errors.push(validationIssue("category", "CATEGORY_MAPPING_REQUIRED", "PttAVM kategori ID eşlemesi gerekli."));
    }
    if (!product.images.length) {
      errors.push(validationIssue("images", "IMAGE_REQUIRED", "PttAVM için en az bir görsel gerekli."));
    }
    for (const variant of product.variants) {
      if (!variant.barcode) {
        errors.push(validationIssue("barcode", "BARCODE_REQUIRED", `${variant.sku} için barkod gerekli.`));
      }
      if (variant.availableStock < 0) {
        errors.push(validationIssue("stock", "STOCK_INVALID", `${variant.sku} stok değeri negatif olamaz.`));
      }
    }
    return validationResult(errors);
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
        categoryId: mapping.externalCategoryId ? Number(mapping.externalCategoryId) : null,
        barcode: variant.barcode,
        name: variant.title || product.title,
        priceWithVat: Number((variant.priceMinor / 100).toFixed(2)),
        vatRate: Math.round(product.vatRateBasisPoints / 100),
        shortDescription: product.shortDescription,
        longDescription: product.description,
        quantity: variant.availableStock,
        images: product.images.map((url) => ({ url })),
        active: variant.availableStock > 0,
        productCode: variant.sku,
        brand: product.brand.name,
        basketMaxQuantity: Math.max(variant.moq, variant.quantityStep),
      },
    }));
  }

  async publishProducts(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    try {
      const response = await fetch("https://integration-api.pttavm.com/api/v1/products/upsert", {
        method: "POST",
        headers: requestHeaders(credentials),
        body: JSON.stringify({ items: products }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        return {
          success: false,
          mode: "LIVE",
          batchRequestId: responseTrackingId(payload),
          errors: [this.normalizeProviderError(payload ?? `HTTP ${response.status}`)],
          warnings: [],
        };
      }
      return {
        success: true,
        mode: "LIVE",
        batchRequestId: responseTrackingId(payload),
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId: null,
        errors: [this.normalizeProviderError(error)],
        warnings: [],
      };
    }
  }

  async updatePriceAndInventory(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    const items = products.map((product) => ({
      barcode: product.barcode,
      quantity: product.quantity,
      priceWithVat: product.priceWithVat,
      productCode: product.productCode,
    }));
    try {
      const response = await fetch("https://integration-api.pttavm.com/api/v1/products/stock-prices", {
        method: "POST",
        headers: requestHeaders(credentials),
        body: JSON.stringify({ items }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      return response.ok
        ? {
            success: true,
            mode: "LIVE",
            batchRequestId: responseTrackingId(payload),
            errors: [],
            warnings: [],
          }
        : {
            success: false,
            mode: "LIVE",
            batchRequestId: responseTrackingId(payload),
            errors: [this.normalizeProviderError(payload ?? `HTTP ${response.status}`)],
            warnings: [],
          };
    } catch (error) {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId: null,
        errors: [this.normalizeProviderError(error)],
        warnings: [],
      };
    }
  }

  async getPublishStatus(
    credentials: MarketplaceConnectionCredentials,
    batchRequestId: string,
  ): Promise<MarketplacePublishResult> {
    try {
      const response = await fetch(
        `https://integration-api.pttavm.com/api/v1/products/tracking-result/${encodeURIComponent(batchRequestId)}`,
        { headers: requestHeaders(credentials), cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as unknown;
      return response.ok
        ? { success: true, mode: "LIVE", batchRequestId, errors: [], warnings: [] }
        : {
            success: false,
            mode: "LIVE",
            batchRequestId,
            errors: [this.normalizeProviderError(payload ?? `HTTP ${response.status}`)],
            warnings: [],
          };
    } catch (error) {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId,
        errors: [this.normalizeProviderError(error)],
        warnings: [],
      };
    }
  }

  normalizeProviderError(error: unknown): MarketplaceValidationIssue {
    if (error instanceof Error) return validationIssue("provider", "PTTAVM_ERROR", error.message);
    if (error && typeof error === "object") {
      const object = error as Record<string, unknown>;
      const message = object.message ?? object.errorMessage ?? object.error_message;
      if (typeof message === "string") return validationIssue("provider", "PTTAVM_ERROR", message);
    }
    return validationIssue("provider", "PTTAVM_ERROR", "PttAVM isteği başarısız oldu.");
  }
}
