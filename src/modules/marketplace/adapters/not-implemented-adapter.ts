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

export class NotImplementedMarketplaceAdapter implements MarketplaceChannelAdapter {
  constructor(readonly channel: "HEPSIBURADA" | "AMAZON_TR") {}

  async validateConnection(
    credentials: MarketplaceConnectionCredentials | null,
  ): Promise<MarketplaceConnectionHealth> {
    void credentials;
    return { valid: false, mode: "PREVIEW", code: "NOT_IMPLEMENTED" };
  }

  mapProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): MarketplaceMappedProduct[] {
    void mapping;
    const validation = validationResult([
      validationIssue(
        "channel",
        "NOT_IMPLEMENTED",
        `${this.channel} canlı adaptörü henüz uygulanmadı.`,
      ),
    ]);
    return product.variants.map((variant) => ({
      productId: product.productId,
      variantId: variant.variantId,
      payload: null,
      validation,
    }));
  }

  validateProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): CanonicalMarketplaceValidationResult {
    void product;
    void mapping;
    return validationResult([
      validationIssue(
        "channel",
        "NOT_IMPLEMENTED",
        `${this.channel} canlı adaptörü henüz uygulanmadı.`,
      ),
    ]);
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
          "NOT_IMPLEMENTED",
          `${this.channel} canlı adaptörü henüz uygulanmadı.`,
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
    void batchRequestId;
    return {
      success: false,
      mode: "PREVIEW",
      batchRequestId: null,
      errors: [
        validationIssue(
          "channel",
          "NOT_IMPLEMENTED",
          `${this.channel} canlı adaptörü henüz uygulanmadı.`,
        ),
      ],
      warnings: [],
    };
  }

  normalizeProviderError(error: unknown): MarketplaceValidationIssue {
    void error;
    return validationIssue(
      "channel",
      "NOT_IMPLEMENTED",
      `${this.channel} canlı adaptörü henüz uygulanmadı.`,
    );
  }
}
