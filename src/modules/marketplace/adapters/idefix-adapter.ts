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

function baseUrl(credentials: MarketplaceConnectionCredentials): string {
  return credentials.environment === "STAGE"
    ? "https://ide-pimapi.idefiks.net/api"
    : "https://merchantapi.idefix.com";
}

function headers(credentials: MarketplaceConnectionCredentials): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-KEY": Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64"),
  };
}

function batchId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>).batchRequestId;
  return typeof candidate === "string" && candidate ? candidate : null;
}

export class IdefixMarketplaceAdapter implements MarketplaceChannelAdapter {
  readonly channel = "IDEFIX" as const;

  async validateConnection(
    credentials: MarketplaceConnectionCredentials | null,
  ): Promise<MarketplaceConnectionHealth> {
    if (!credentials?.sellerId || !credentials.apiKey || !credentials.apiSecret) {
      return { valid: false, mode: "PREVIEW", code: "CREDENTIALS_REQUIRED" };
    }
    try {
      const url =
        credentials.environment === "STAGE"
          ? `${baseUrl(credentials)}/connector/product-category`
          : `${baseUrl(credentials)}/pim/pool/${encodeURIComponent(credentials.sellerId)}/list?page=1&limit=1`;
      const response = await fetch(url, { headers: headers(credentials), cache: "no-store" });
      return response.ok
        ? { valid: true, mode: "LIVE" }
        : { valid: false, mode: "LIVE", code: `IDEFIX_HTTP_${response.status}` };
    } catch {
      return { valid: false, mode: "LIVE", code: "IDEFIX_CONNECTION_FAILED" };
    }
  }

  validateProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): CanonicalMarketplaceValidationResult {
    const errors: MarketplaceValidationIssue[] = [];
    if (!mapping.externalCategoryId || !Number.isFinite(Number(mapping.externalCategoryId))) {
      errors.push(validationIssue("category", "CATEGORY_MAPPING_REQUIRED", "idefix kategori ID eşlemesi gerekli."));
    }
    if (!mapping.externalBrandId || !Number.isFinite(Number(mapping.externalBrandId))) {
      errors.push(validationIssue("brand", "BRAND_MAPPING_REQUIRED", "idefix marka ID eşlemesi gerekli."));
    }
    if (!product.images.length) {
      errors.push(validationIssue("images", "IMAGE_REQUIRED", "idefix için en az bir görsel gerekli."));
    }
    for (const variant of product.variants) {
      if (!variant.barcode) {
        errors.push(validationIssue("barcode", "BARCODE_REQUIRED", `${variant.sku} için barkod gerekli.`));
      }
    }
    return validationResult(errors);
  }

  mapProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): MarketplaceMappedProduct[] {
    const validation = this.validateProduct(product, mapping);
    const attributes = mapping.attributes.map((attribute) => ({
      attributeId: Number(attribute.externalAttributeId),
      attributeValueId: attribute.externalValueId ? Number(attribute.externalValueId) : null,
      customAttributeValue: attribute.externalValueId ? null : String(product.attributes[attribute.sourceAttributeKey] ?? ""),
    }));
    return product.variants.map((variant) => ({
      productId: product.productId,
      variantId: variant.variantId,
      validation,
      payload: {
        barcode: variant.barcode,
        title: variant.title || product.title,
        productMainId: product.productId,
        brandId: mapping.externalBrandId ? Number(mapping.externalBrandId) : null,
        categoryId: mapping.externalCategoryId ? Number(mapping.externalCategoryId) : null,
        inventoryQuantity: variant.availableStock,
        vendorStockCode: variant.sku,
        description: product.description,
        price: Number((variant.priceMinor / 100).toFixed(2)),
        comparePrice: Number((variant.priceMinor / 100).toFixed(2)),
        vatRate: Math.round(product.vatRateBasisPoints / 100),
        images: product.images.map((url) => ({ url })),
        attributes,
      },
    }));
  }

  async publishProducts(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    if (!credentials.sellerId) {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId: null,
        errors: [validationIssue("sellerId", "SELLER_ID_REQUIRED", "idefix Satıcı ID gerekli.")],
        warnings: [],
      };
    }
    try {
      const responses = await Promise.all(
        products.map(async (product) => {
          const response = await fetch(
            `${baseUrl(credentials)}/pim/pool/${encodeURIComponent(credentials.sellerId)}/create`,
            {
              method: "POST",
              headers: headers(credentials),
              body: JSON.stringify(product),
              cache: "no-store",
            },
          );
          const body = (await response.json().catch(() => null)) as unknown;
          return { response, body };
        }),
      );
      const failed = responses.find(({ response }) => !response.ok);
      if (failed) {
        return {
          success: false,
          mode: "LIVE",
          batchRequestId: batchId(failed.body),
          errors: [this.normalizeProviderError(failed.body ?? `HTTP ${failed.response.status}`)],
          warnings: [],
        };
      }
      return {
        success: true,
        mode: "LIVE",
        batchRequestId: responses.map(({ body }) => batchId(body)).filter(Boolean).join(",") || null,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return { success: false, mode: "LIVE", batchRequestId: null, errors: [this.normalizeProviderError(error)], warnings: [] };
    }
  }

  async updatePriceAndInventory(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    if (!credentials.sellerId) {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId: null,
        errors: [validationIssue("sellerId", "SELLER_ID_REQUIRED", "idefix Satıcı ID gerekli.")],
        warnings: [],
      };
    }
    const items = products.map((product) => ({
      barcode: product.barcode,
      price: product.price,
      comparePrice: product.comparePrice ?? product.price,
      inventoryQuantity: product.inventoryQuantity,
      maximumPurchasableQuantity: product.inventoryQuantity,
      deliveryDuration: 1,
      deliveryType: "regular",
      isZoneSale: null,
    }));
    try {
      const response = await fetch(
        `${baseUrl(credentials)}/pim/catalog/${encodeURIComponent(credentials.sellerId)}/inventory-upload`,
        {
          method: "POST",
          headers: headers(credentials),
          body: JSON.stringify({ items }),
          cache: "no-store",
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      return response.ok
        ? { success: true, mode: "LIVE", batchRequestId: batchId(body), errors: [], warnings: [] }
        : { success: false, mode: "LIVE", batchRequestId: batchId(body), errors: [this.normalizeProviderError(body ?? `HTTP ${response.status}`)], warnings: [] };
    } catch (error) {
      return { success: false, mode: "LIVE", batchRequestId: null, errors: [this.normalizeProviderError(error)], warnings: [] };
    }
  }

  async getPublishStatus(
    credentials: MarketplaceConnectionCredentials,
    batchRequestId: string,
  ): Promise<MarketplacePublishResult> {
    if (!credentials.sellerId) {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId,
        errors: [validationIssue("sellerId", "SELLER_ID_REQUIRED", "idefix Satıcı ID gerekli.")],
        warnings: [],
      };
    }
    try {
      const response = await fetch(
        `${baseUrl(credentials)}/pim/pool/${encodeURIComponent(credentials.sellerId)}/batch-result/${encodeURIComponent(batchRequestId)}`,
        { headers: headers(credentials), cache: "no-store" },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      return response.ok
        ? { success: true, mode: "LIVE", batchRequestId, errors: [], warnings: [] }
        : { success: false, mode: "LIVE", batchRequestId, errors: [this.normalizeProviderError(body ?? `HTTP ${response.status}`)], warnings: [] };
    } catch (error) {
      return { success: false, mode: "LIVE", batchRequestId, errors: [this.normalizeProviderError(error)], warnings: [] };
    }
  }

  normalizeProviderError(error: unknown): MarketplaceValidationIssue {
    if (error instanceof Error) return validationIssue("provider", "IDEFIX_ERROR", error.message);
    if (error && typeof error === "object") {
      const object = error as Record<string, unknown>;
      const message = object.message ?? object.failureReasons ?? object.error;
      if (typeof message === "string") return validationIssue("provider", "IDEFIX_ERROR", message);
    }
    return validationIssue("provider", "IDEFIX_ERROR", "idefix isteği başarısız oldu.");
  }
}
