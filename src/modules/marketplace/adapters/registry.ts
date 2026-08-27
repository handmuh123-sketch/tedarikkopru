import "server-only";

import { IdefixMarketplaceAdapter } from "./idefix-adapter";
import { MultiChannelMarketplaceAdapter } from "./multi-channel-adapter";
import { PttAvmMarketplaceAdapter } from "./pttavm-adapter";
import { TrendyolMarketplaceAdapter } from "./trendyol-adapter";
import type { MarketplaceChannel, MarketplaceChannelAdapter } from "../domain/types";

const adapters: Record<MarketplaceChannel, MarketplaceChannelAdapter> = {
  TRENDYOL: new TrendyolMarketplaceAdapter(),
  HEPSIBURADA: new MultiChannelMarketplaceAdapter("HEPSIBURADA"),
  AMAZON_TR: new MultiChannelMarketplaceAdapter("AMAZON_TR"),
  N11: new MultiChannelMarketplaceAdapter("N11"),
  PAZARAMA: new MultiChannelMarketplaceAdapter("PAZARAMA"),
  PTTAVM: new PttAvmMarketplaceAdapter(),
  CICEKSEPETI: new MultiChannelMarketplaceAdapter("CICEKSEPETI"),
  IDEFIX: new IdefixMarketplaceAdapter(),
};

export function marketplaceAdapter(channel: MarketplaceChannel): MarketplaceChannelAdapter {
  return adapters[channel];
}
