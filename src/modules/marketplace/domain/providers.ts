import type { MarketplaceChannel } from "./types";

export type MarketplaceProviderDefinition = {
  channel: MarketplaceChannel;
  slug: string;
  name: string;
  shortDescription: string;
  sellerIdLabel: string;
  apiKeyLabel: string;
  apiSecretLabel: string;
  stageLabel: string;
  productionLabel: string;
  connectionMode: "LIVE_TEST" | "PREVIEW_TEST";
  capabilities: readonly string[];
};

export const marketplaceProviders: readonly MarketplaceProviderDefinition[] = [
  {
    channel: "TRENDYOL",
    slug: "trendyol",
    name: "Trendyol",
    shortDescription: "Kategori/marka eşleme, ürün önizleme, JSON aktarımı ve kontrollü canlı yayın.",
    sellerIdLabel: "Satıcı ID",
    apiKeyLabel: "API Key",
    apiSecretLabel: "API Secret",
    stageLabel: "Trendyol stage",
    productionLabel: "Trendyol production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Durum", "Webhook"],
  },
  {
    channel: "HEPSIBURADA",
    slug: "hepsiburada",
    name: "Hepsiburada",
    shortDescription: "Merchant bağlantısı, katalog hazırlığı, listing ve stok/fiyat entegrasyon altyapısı.",
    sellerIdLabel: "Merchant ID",
    apiKeyLabel: "API kullanıcı / servis anahtarı",
    apiSecretLabel: "API şifresi",
    stageLabel: "Hepsiburada test",
    productionLabel: "Hepsiburada production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Katalog", "Listing", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "AMAZON_TR",
    slug: "amazon-tr",
    name: "Amazon Türkiye",
    shortDescription: "Amazon SP-API LWA yetkilendirmesi, ürün hazırlığı, fiyat, stok ve sipariş altyapısı.",
    sellerIdLabel: "Seller / Merchant ID",
    apiKeyLabel: "LWA Client ID",
    apiSecretLabel: "LWA Client Secret",
    stageLabel: "Amazon SP-API hazırlık",
    productionLabel: "Amazon Türkiye production",
    connectionMode: "LIVE_TEST",
    capabilities: ["LWA", "Ürün", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "N11",
    slug: "n11",
    name: "n11",
    shortDescription: "Resmi REST API hesabı, kategori eşleme, ürün hazırlığı ve stok/fiyat aktarım altyapısı.",
    sellerIdLabel: "Mağaza ID / adı",
    apiKeyLabel: "appkey",
    apiSecretLabel: "appsecret",
    stageLabel: "n11 hazırlık",
    productionLabel: "n11 production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Katalog", "Ürün", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "PAZARAMA",
    slug: "pazarama",
    name: "Pazarama",
    shortDescription: "OAuth client_credentials bağlantısı, ürün hazırlığı, kategori, fiyat ve stok altyapısı.",
    sellerIdLabel: "Satıcı / mağaza ID",
    apiKeyLabel: "Client ID",
    apiSecretLabel: "Client Secret",
    stageLabel: "Pazarama hazırlık",
    productionLabel: "Pazarama production",
    connectionMode: "LIVE_TEST",
    capabilities: ["OAuth", "Ürün", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "PTTAVM",
    slug: "pttavm",
    name: "PttAVM",
    shortDescription: "Resmi REST API ile ürün upsert, stok/fiyat gönderimi ve işlem durum takibi.",
    sellerIdLabel: "Mağaza / merchant ID",
    apiKeyLabel: "Api-Key",
    apiSecretLabel: "Access-Token",
    stageLabel: "PttAVM hazırlık",
    productionLabel: "PttAVM production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Takip", "Sipariş"],
  },
  {
    channel: "CICEKSEPETI",
    slug: "ciceksepeti",
    name: "ÇiçekSepeti",
    shortDescription: "x-api-key mağaza bağlantısı ile ürün, fiyat, stok ve sipariş kanal altyapısı.",
    sellerIdLabel: "Supplier ID",
    apiKeyLabel: "API Key",
    apiSecretLabel: "API Key doğrulaması",
    stageLabel: "ÇiçekSepeti sandbox",
    productionLabel: "ÇiçekSepeti production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Sipariş", "Kargo"],
  },
  {
    channel: "IDEFIX",
    slug: "idefix",
    name: "idefix",
    shortDescription: "Resmi Marketplace API ile ürün oluşturma, stok/fiyat ve batch durum takibi.",
    sellerIdLabel: "Satıcı ID (vendorId)",
    apiKeyLabel: "API Key",
    apiSecretLabel: "API Secret Key",
    stageLabel: "idefix stage",
    productionLabel: "idefix production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Batch", "Sipariş"],
  },
] as const;

export function marketplaceProviderByChannel(
  channel: MarketplaceChannel,
): MarketplaceProviderDefinition {
  const provider = marketplaceProviders.find((candidate) => candidate.channel === channel);
  if (!provider) throw new Error(`Unknown marketplace channel: ${channel}`);
  return provider;
}

export function marketplaceProviderBySlug(slug: string): MarketplaceProviderDefinition | null {
  return marketplaceProviders.find((candidate) => candidate.slug === slug) ?? null;
}
