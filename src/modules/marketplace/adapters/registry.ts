import "server-only";

import { NotImplementedMarketplaceAdapter } from "./not-implemented-adapter";
import { TrendyolMarketplaceAdapter } from "./trendyol-adapter";
import type { MarketplaceChannel, MarketplaceChannelAdapter } from "../domain/types";

const adapters: Record<MarketplaceChannel, MarketplaceChannelAdapter> = {
  TRENDYOL: new TrendyolMarketplaceAdapter(),
  HEPSIBURADA: new NotImplementedMarketplaceAdapter("HEPSIBURADA"),
  AMAZON_TR: new NotImplementedMarketplaceAdapter("AMAZON_TR"),
};

export function marketplaceAdapter(channel: MarketplaceChannel): MarketplaceChannelAdapter {
  return adapters[channel];
}
