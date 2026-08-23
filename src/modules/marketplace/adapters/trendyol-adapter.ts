import "server-only";

import { serverEnvironment } from "@/lib/env/server";

import {
  minorToMarketplaceDecimal,
  mockBatchRequestId,
  validationIssue,
  validationResult,
} from "../domain/marketplace-rules";
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

const trendyoProductBaseUrls = {
  PRODUCTION: "https://apigw.trendyol.com",
  STAGE: "https://stageapigw.trendyol.com",
} as const;

function numericIdentifier(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function productValidation(
  product: CanonicalMarketplaceProduct,
  mapping: MarketplaceProductMapping,
): MarketplaceValidationIssue[] {
  const errors: MarketplaceValidationIssue[] = [];
  if (!numericIdentifier(mapping.externalCategoryId))
    errors.push(
      validationIssue(
        "category",
        "CATEGORY_MAPPING_MISSING",
        "Trendyol kategori eşleşmesi bulunmuyor.",
      ),
    );
  if (!numericIdentifier(mapping.externalBrandId))
    errors.push(
      validationIssue("brand", "BRAND_MAPPING_MISSING", "Trendyol marka eşleşmesi bulunmuyor."),
    );
  if (!product.title.trim() || product.title.length > 100)
    errors.push(
      validationIssue("title", "TITLE_INVALID", "Ürün başlığı 1-100 karakter olmalıdır."),
    );
  if (!product.description.trim() || product.description.length > 30_000)
    errors.push(
      validationIssue(
        "description",
        "DESCRIPTION_INVALID",
        "Ürün açıklaması 1-30.000 karakter olmalıdır.",
      ),
    );
  if (!product.images.some((image) => image.startsWith("https://")))
    errors.push(
      validationIssue(
        "images",
        "PUBLIC_IMAGE_REQUIRED",
        "Trendyol için en az bir HTTPS erişilebilir ürün görseli gereklidir.",
      ),
    );
  if (product.images.length > 8)
    errors.push(
      validationIssue("images", "IMAGE_LIMIT", "Bir barkod için en fazla 8 görsel gönderilebilir."),
    );
  if (!Number.isInteger(product.vatRateBasisPoints / 100))
    errors.push(
      validationIssue(
        "vatRate",
        "VAT_RATE_INVALID",
        "Trendyol KDV oranı tam yüzde değeri olmalıdır.",
      ),
    );
  const attributeKeys = Object.keys(product.attributes);
  if (attributeKeys.length === 0)
    errors.push(
      validationIssue(
        "attributes",
        "ATTRIBUTES_MISSING",
        "Trendyol kategori özellikleri için ürün niteliği bulunmuyor.",
      ),
    );
  for (const attributeKey of attributeKeys) {
    if (!mapping.attributes.some((item) => item.sourceAttributeKey === attributeKey))
      errors.push(
        validationIssue(
          `attributes.${attributeKey}`,
          "ATTRIBUTE_MAPPING_MISSING",
          `“${attributeKey}” niteliği için Trendyol eşleşmesi bulunmuyor.`,
        ),
      );
  }
  return errors;
}

function variantValidation(
  product: CanonicalMarketplaceProduct,
  variant: CanonicalMarketplaceProduct["variants"][number],
): MarketplaceValidationIssue[] {
  const errors: MarketplaceValidationIssue[] = [];
  if (!variant.barcode || !/^[\p{L}\p{N}._-]{1,40}$/u.test(variant.barcode))
    errors.push(
      validationIssue(
        "barcode",
        "BARCODE_INVALID",
        "Barkod 1-40 karakter olmalı; boşluk ve izin verilmeyen karakter içermemelidir.",
      ),
    );
  if (!variant.sku.trim() || variant.sku.length > 100)
    errors.push(
      validationIssue("stockCode", "STOCK_CODE_INVALID", "Stok kodu 1-100 karakter olmalıdır."),
    );
  if (variant.priceMinor <= 0)
    errors.push(validationIssue("salePrice", "PRICE_INVALID", "Satış fiyatı pozitif olmalıdır."));
  if (variant.currency !== "TRY")
    errors.push(
      validationIssue(
        "currency",
        "CURRENCY_UNSUPPORTED",
        "Trendyol aktarımı yalnız TRY fiyatı kabul eder.",
      ),
    );
  if (!Number.isInteger(variant.availableStock) || variant.availableStock < 0)
    errors.push(validationIssue("quantity", "STOCK_INVALID", "Kullanılabilir stok geçersiz."));
  if (product.productId.length > 40)
    errors.push(
      validationIssue(
        "productMainId",
        "PRODUCT_MAIN_ID_INVALID",
        "Ürün ana kodu en fazla 40 karakter olmalıdır.",
      ),
    );
  return errors;
}

function mappedAttributes(
  product: CanonicalMarketplaceProduct,
  mapping: MarketplaceProductMapping,
): Array<Record<string, number | string>> {
  const attributes: Array<Record<string, number | string>> = [];
  for (const attribute of mapping.attributes) {
    const value = product.attributes[attribute.sourceAttributeKey];
    if (value === undefined || value === null || value === "") continue;
    const attributeId = numericIdentifier(attribute.externalAttributeId);
    if (!attributeId) continue;
    const valueId = numericIdentifier(attribute.externalValueId);
    if (valueId) attributes.push({ attributeId, attributeValueId: valueId });
    else attributes.push({ attributeId, customAttributeValue: String(value) });
  }
  return attributes;
}

function mapTrendyolProduct(
  product: CanonicalMarketplaceProduct,
  mapping: MarketplaceProductMapping,
): MarketplaceMappedProduct[] {
  const productErrors = productValidation(product, mapping);
  const categoryId = numericIdentifier(mapping.externalCategoryId);
  const brandId = numericIdentifier(mapping.externalBrandId);
  return product.variants.map((variant) => {
    const errors = [...productErrors, ...variantValidation(product, variant)];
    const validation = validationResult(errors);
    if (!validation.valid || !categoryId || !brandId || !variant.barcode) {
      return {
        productId: product.productId,
        variantId: variant.variantId,
        payload: null,
        validation,
      };
    }
    return {
      productId: product.productId,
      variantId: variant.variantId,
      payload: {
        barcode: variant.barcode,
        title: product.title,
        description: product.description,
        productMainId: product.productId,
        brandId,
        categoryId,
        quantity: variant.availableStock,
        stockCode: variant.sku,
        origin: product.originCountry,
        listPrice: minorToMarketplaceDecimal(variant.priceMinor),
        salePrice: minorToMarketplaceDecimal(variant.priceMinor),
        vatRate: product.vatRateBasisPoints / 100,
        images: product.images.slice(0, 8).map((url) => ({ url })),
        attributes: mappedAttributes(product, mapping),
      },
      validation,
    };
  });
}

function providerError(status: number): MarketplaceValidationIssue {
  if (status === 401)
    return validationIssue(
      "connection",
      "AUTHENTICATION_FAILED",
      "Pazaryeri kimlik bilgileri doğrulanamadı.",
    );
  if (status === 403)
    return validationIssue(
      "connection",
      "PROVIDER_FORBIDDEN",
      "Pazaryeri isteği yetkilendirilmedi.",
    );
  if (status === 429)
    return validationIssue(
      "provider",
      "RATE_LIMITED",
      "Pazaryeri istek limiti aşıldı; daha sonra tekrar deneyin.",
    );
  if (status >= 500)
    return validationIssue(
      "provider",
      "PROVIDER_TEMPORARY",
      "Pazaryeri geçici olarak yanıt veremedi.",
    );
  return validationIssue("provider", "PROVIDER_REQUEST_FAILED", "Pazaryeri isteği tamamlanamadı.");
}

function headers(credentials: MarketplaceConnectionCredentials): HeadersInit {
  return {
    authorization: `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64")}`,
    "content-type": "application/json",
    "user-agent": `${credentials.sellerId} - TedarikKopru`,
  };
}

async function request(
  credentials: MarketplaceConnectionCredentials,
  path: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(`${trendyoProductBaseUrls[credentials.environment]}${path}`, {
    ...init,
    headers: { ...headers(credentials), ...init.headers },
  });
}

export class TrendyolMarketplaceAdapter implements MarketplaceChannelAdapter {
  readonly channel = "TRENDYOL" as const;

  async validateConnection(
    credentials: MarketplaceConnectionCredentials | null,
  ): Promise<MarketplaceConnectionHealth> {
    if (!serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL)
      return { valid: true, mode: "PREVIEW", code: "LIVE_FEATURE_DISABLED" };
    if (!credentials) return { valid: false, mode: "LIVE", code: "CREDENTIALS_MISSING" };
    try {
      const response = await request(
        credentials,
        `/integration/sellers/${encodeURIComponent(credentials.sellerId)}/addresses`,
        { method: "GET" },
      );
      return response.ok
        ? { valid: true, mode: "LIVE" }
        : { valid: false, mode: "LIVE", code: providerError(response.status).code };
    } catch {
      return { valid: false, mode: "LIVE", code: "PROVIDER_UNAVAILABLE" };
    }
  }

  mapProduct(product: CanonicalMarketplaceProduct, mapping: MarketplaceProductMapping) {
    return mapTrendyolProduct(product, mapping);
  }

  validateProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): CanonicalMarketplaceValidationResult {
    const mapped = mapTrendyolProduct(product, mapping);
    const errors = mapped.flatMap((item) => item.validation.errors);
    const warnings = mapped.flatMap((item) => item.validation.warnings);
    return validationResult(
      errors.filter(
        (item, index, values) =>
          values.findIndex(
            (candidate) => candidate.code === item.code && candidate.field === item.field,
          ) === index,
      ),
      warnings,
    );
  }

  async publishProducts(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    if (!serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL)
      return {
        success: false,
        mode: "PREVIEW",
        batchRequestId: mockBatchRequestId(products),
        errors: [],
        warnings: [
          validationIssue(
            "provider",
            "LIVE_FEATURE_DISABLED",
            "Test modu — Trendyol’a gerçek gönderim yapılmadı.",
          ),
        ],
      };
    try {
      const response = await request(
        credentials,
        `/integration/product/sellers/${encodeURIComponent(credentials.sellerId)}/v2/products`,
        { method: "POST", body: JSON.stringify({ items: products }) },
      );
      if (!response.ok)
        return {
          success: false,
          mode: "LIVE",
          batchRequestId: null,
          errors: [providerError(response.status)],
          warnings: [],
        };
      const body = (await response.json().catch(() => null)) as { batchRequestId?: unknown } | null;
      const batchRequestId =
        typeof body?.batchRequestId === "string" ? body.batchRequestId.slice(0, 160) : null;
      return { success: true, mode: "LIVE", batchRequestId, errors: [], warnings: [] };
    } catch {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId: null,
        errors: [
          validationIssue(
            "provider",
            "PROVIDER_UNAVAILABLE",
            "Pazaryeri geçici olarak yanıt veremedi.",
          ),
        ],
        warnings: [],
      };
    }
  }

  async updatePriceAndInventory(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult> {
    if (!serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL)
      return {
        success: false,
        mode: "PREVIEW",
        batchRequestId: mockBatchRequestId(products),
        errors: [],
        warnings: [
          validationIssue(
            "provider",
            "LIVE_FEATURE_DISABLED",
            "Test modu — Trendyol’a gerçek stok veya fiyat güncellemesi yapılmadı.",
          ),
        ],
      };
    const items = products.map((product) => ({
      barcode: product.barcode,
      quantity: product.quantity,
      salePrice: product.salePrice,
      listPrice: product.listPrice,
    }));
    try {
      const response = await request(
        credentials,
        `/integration/inventory/sellers/${encodeURIComponent(credentials.sellerId)}/products/price-and-inventory`,
        { method: "POST", body: JSON.stringify({ items }) },
      );
      if (!response.ok)
        return {
          success: false,
          mode: "LIVE",
          batchRequestId: null,
          errors: [providerError(response.status)],
          warnings: [],
        };
      const body = (await response.json().catch(() => null)) as { batchRequestId?: unknown } | null;
      return {
        success: true,
        mode: "LIVE",
        batchRequestId:
          typeof body?.batchRequestId === "string" ? body.batchRequestId.slice(0, 160) : null,
        errors: [],
        warnings: [],
      };
    } catch {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId: null,
        errors: [
          validationIssue(
            "provider",
            "PROVIDER_UNAVAILABLE",
            "Pazaryeri geçici olarak yanıt veremedi.",
          ),
        ],
        warnings: [],
      };
    }
  }

  async getPublishStatus(
    credentials: MarketplaceConnectionCredentials,
    batchRequestId: string,
  ): Promise<MarketplacePublishResult> {
    if (!serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL)
      return {
        success: false,
        mode: "PREVIEW",
        batchRequestId,
        errors: [],
        warnings: [
          validationIssue(
            "provider",
            "LIVE_FEATURE_DISABLED",
            "Test modu — Trendyol batch durumu sorgulanmadı.",
          ),
        ],
      };
    try {
      const response = await request(
        credentials,
        `/integration/product/sellers/${encodeURIComponent(credentials.sellerId)}/products/batch-requests/${encodeURIComponent(batchRequestId)}`,
        { method: "GET" },
      );
      return response.ok
        ? { success: true, mode: "LIVE", batchRequestId, errors: [], warnings: [] }
        : {
            success: false,
            mode: "LIVE",
            batchRequestId,
            errors: [providerError(response.status)],
            warnings: [],
          };
    } catch {
      return {
        success: false,
        mode: "LIVE",
        batchRequestId,
        errors: [
          validationIssue(
            "provider",
            "PROVIDER_UNAVAILABLE",
            "Pazaryeri geçici olarak yanıt veremedi.",
          ),
        ],
        warnings: [],
      };
    }
  }

  normalizeProviderError(error: unknown): MarketplaceValidationIssue {
    return error instanceof Response
      ? providerError(error.status)
      : validationIssue("provider", "PROVIDER_REQUEST_FAILED", "Pazaryeri isteği tamamlanamadı.");
  }
}
