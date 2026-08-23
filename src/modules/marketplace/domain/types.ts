export const marketplaceChannels = ["TRENDYOL", "HEPSIBURADA", "AMAZON_TR"] as const;

export type MarketplaceChannel = (typeof marketplaceChannels)[number];

export type MarketplaceValidationIssue = {
  field: string;
  code: string;
  message: string;
};

export type CanonicalMarketplaceValidationResult = {
  valid: boolean;
  errors: MarketplaceValidationIssue[];
  warnings: MarketplaceValidationIssue[];
};

export type CanonicalMarketplaceVariant = {
  variantId: string;
  sku: string;
  barcode: string | null;
  title: string;
  priceMinor: number;
  currency: string;
  availableStock: number;
  moq: number;
  quantityStep: number;
};

export type CanonicalMarketplaceProduct = {
  productId: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  category: { id: string; name: string; path: string };
  brand: { id: string; name: string };
  supplier: { organizationId: string; tradeName: string };
  originCountry: string;
  vatRateBasisPoints: number;
  attributes: Record<string, unknown>;
  images: string[];
  variants: CanonicalMarketplaceVariant[];
};

export type MarketplaceConnectionCredentials = {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  environment: "STAGE" | "PRODUCTION";
  shipmentAddressId?: number;
  returningAddressId?: number;
  webhookApiKey?: string;
};

export type MarketplaceConnectionHealth = {
  valid: boolean;
  mode: "LIVE" | "PREVIEW";
  code?: string;
};

export type MarketplacePublishResult = {
  success: boolean;
  mode: "LIVE" | "PREVIEW";
  batchRequestId: string | null;
  errors: MarketplaceValidationIssue[];
  warnings: MarketplaceValidationIssue[];
};

export type MarketplaceProductMapping = {
  externalCategoryId: string | null;
  externalBrandId: string | null;
  attributes: Array<{
    sourceAttributeKey: string;
    externalAttributeId: string;
    externalValueId: string | null;
  }>;
};

export type MarketplaceMappedProduct = {
  productId: string;
  variantId: string;
  payload: Record<string, unknown> | null;
  validation: CanonicalMarketplaceValidationResult;
};

export type MarketplaceChannelAdapter = {
  readonly channel: MarketplaceChannel;
  validateConnection(
    credentials: MarketplaceConnectionCredentials | null,
  ): Promise<MarketplaceConnectionHealth>;
  mapProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): MarketplaceMappedProduct[];
  validateProduct(
    product: CanonicalMarketplaceProduct,
    mapping: MarketplaceProductMapping,
  ): CanonicalMarketplaceValidationResult;
  publishProducts(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult>;
  updatePriceAndInventory(
    credentials: MarketplaceConnectionCredentials,
    products: Array<Record<string, unknown>>,
  ): Promise<MarketplacePublishResult>;
  getPublishStatus(
    credentials: MarketplaceConnectionCredentials,
    batchRequestId: string,
  ): Promise<MarketplacePublishResult>;
  normalizeProviderError(error: unknown): MarketplaceValidationIssue;
};
