export const opportunityMarketplaceChannels = [
  "TRENDYOL",
  "HEPSIBURADA",
  "AMAZON_TR",
  "N11",
  "PAZARAMA",
  "PTTAVM",
  "CICEKSEPETI",
  "IDEFIX",
] as const;

export type OpportunityMarketplaceChannel = (typeof opportunityMarketplaceChannels)[number];

export type ProductOpportunityInput = {
  priceAmountMinor: number;
  moq: number;
  availableStock: number;
  handlingDays: number;
  hasImage: boolean;
  hasBarcode: boolean;
  verifiedSupplier: boolean;
  warrantyMonths?: number | null;
  categoryChannels: readonly string[];
  brandChannels: readonly string[];
};

export type ProductOpportunity = {
  score: number;
  level: "excellent" | "strong" | "developing";
  readyChannels: OpportunityMarketplaceChannel[];
  readyChannelCount: number;
  reasons: string[];
  metrics: {
    stockScore: number;
    moqScore: number;
    fulfillmentScore: number;
    contentScore: number;
    marketplaceScore: number;
    supplierScore: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizedChannels(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.toUpperCase()));
}

export function calculateProductOpportunity(input: ProductOpportunityInput): ProductOpportunity {
  const safeMoq = Math.max(1, input.moq);
  const stockMultiple = input.availableStock / safeMoq;
  const stockScore = Math.round(clamp(stockMultiple / 8, 0, 1) * 20);

  const moqScore =
    input.moq <= 1 ? 15 : input.moq <= 3 ? 13 : input.moq <= 6 ? 10 : input.moq <= 12 ? 6 : 2;

  const fulfillmentScore =
    input.handlingDays <= 1
      ? 15
      : input.handlingDays <= 2
        ? 13
        : input.handlingDays <= 3
          ? 10
          : input.handlingDays <= 5
            ? 6
            : 2;

  const contentScore = (input.hasImage ? 8 : 0) + (input.hasBarcode ? 7 : 0);
  const categoryChannels = normalizedChannels(input.categoryChannels);
  const brandChannels = normalizedChannels(input.brandChannels);
  const readyChannels = opportunityMarketplaceChannels.filter(
    (channel) =>
      input.hasImage &&
      input.hasBarcode &&
      categoryChannels.has(channel) &&
      brandChannels.has(channel),
  );
  const marketplaceScore = Math.round((readyChannels.length / opportunityMarketplaceChannels.length) * 20);
  const supplierScore = input.verifiedSupplier ? 10 : 0;

  const score = clamp(
    stockScore + moqScore + fulfillmentScore + contentScore + marketplaceScore + supplierScore,
    0,
    100,
  );
  const reasons: string[] = [];
  if (input.moq <= 3) reasons.push("Düşük minimum sipariş");
  if (input.handlingDays <= 2) reasons.push("Hızlı hazırlık");
  if (stockMultiple >= 8) reasons.push("Güçlü stok derinliği");
  if (readyChannels.length > 0) reasons.push(`${readyChannels.length} pazaryeri eşlemesi hazır`);
  if (input.hasBarcode && input.hasImage) reasons.push("Listeleme verisi güçlü");
  if ((input.warrantyMonths ?? 0) > 0) reasons.push("Garanti bilgisi mevcut");
  if (reasons.length === 0) reasons.push("Geliştirme potansiyeli var");

  return {
    score,
    level: score >= 80 ? "excellent" : score >= 62 ? "strong" : "developing",
    readyChannels,
    readyChannelCount: readyChannels.length,
    reasons: reasons.slice(0, 4),
    metrics: {
      stockScore,
      moqScore,
      fulfillmentScore,
      contentScore,
      marketplaceScore,
      supplierScore,
    },
  };
}

export function opportunityLevelLabel(level: ProductOpportunity["level"]): string {
  if (level === "excellent") return "Çok güçlü fırsat";
  if (level === "strong") return "Güçlü fırsat";
  return "Geliştirilebilir";
}
