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
    shortDescription: "SP-API için ürün, fiyat, stok ve sipariş akışlarının ortak kanal altyapısı.",
    sellerIdLabel: "Seller / Merchant ID",
    apiKeyLabel: "LWA Client ID",
    apiSecretLabel: "LWA Client Secret",
    stageLabel: "Amazon hazırlık",
    productionLabel: "Amazon Türkiye production",
    connectionMode: "PREVIEW_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Sipariş", "SP-API"],
  },
  {
    channel: "N11",
    slug: "n11",
    name: "n11",
    shortDescription: "API hesabı, kategori eşleme, ürün hazırlığı ve stok/fiyat aktarım altyapısı.",
    sellerIdLabel: "Mağaza ID / adı",
    apiKeyLabel: "appkey",
    apiSecretLabel: "appsecret",
    stageLabel: "n11 test / hazırlık",
    productionLabel: "n11 production",
    connectionMode: "LIVE_TEST",
    capabilities: ["Katalog", "Ürün", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "PAZARAMA",
    slug: "pazarama",
    name: "Pazarama",
    shortDescription: "Mağaza bağlantısı ve kanal bazlı ürün, fiyat ve stok aktarım hazırlığı.",
    sellerIdLabel: "Satıcı / mağaza ID",
    apiKeyLabel: "API Key / Client ID",
    apiSecretLabel: "API Secret / Client Secret",
    stageLabel: "Pazarama hazırlık",
    productionLabel: "Pazarama production",
    connectionMode: "PREVIEW_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "PTTAVM",
    slug: "pttavm",
    name: "PttAVM",
    shortDescription: "Resmi REST API için ürün upsert, stok/fiyat ve işlem takip altyapısı.",
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
    shortDescription: "Mağaza API bağlantısı için ürün, fiyat, stok ve sipariş kanal altyapısı.",
    sellerIdLabel: "Satıcı / mağaza ID",
    apiKeyLabel: "API Key",
    apiSecretLabel: "API Secret",
    stageLabel: "ÇiçekSepeti hazırlık",
    productionLabel: "ÇiçekSepeti production",
    connectionMode: "PREVIEW_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Sipariş"],
  },
  {
    channel: "IDEFIX",
    slug: "idefix",
    name: "idefix",
    shortDescription: "Marketplace mağaza bağlantısı için ürün, fiyat, stok ve sipariş kanal altyapısı.",
    sellerIdLabel: "Satıcı / mağaza ID",
    apiKeyLabel: "API Key",
    apiSecretLabel: "API Secret",
    stageLabel: "idefix hazırlık",
    productionLabel: "idefix production",
    connectionMode: "PREVIEW_TEST",
    capabilities: ["Ürün", "Fiyat", "Stok", "Sipariş"],
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
