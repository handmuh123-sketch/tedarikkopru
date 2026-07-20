import "server-only";

import { parseServerEnvironment } from "./schema";

const validationContext = process.env.TEDARIKKOPRU_BUILD_PHASE === "compile" ? "build" : "runtime";
const result = parseServerEnvironment(process.env, { validationContext });

if (!result.success) {
  const issueSummary = result.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Geçersiz sunucu ortam değişkenleri: ${issueSummary}`);
}

export const serverEnvironment = result.data;

export const featureFlags = Object.freeze({
  livePayments: serverEnvironment.FEATURE_LIVE_PAYMENTS,
  dropshipping: serverEnvironment.FEATURE_DROPSHIPPING,
  marketplaceTrendyol: serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL,
  marketplaceHepsiburada: serverEnvironment.FEATURE_MARKETPLACE_HEPSIBURADA,
  marketplaceAmazonTr: serverEnvironment.FEATURE_MARKETPLACE_AMAZON_TR,
  carrierIntegrations: serverEnvironment.FEATURE_CARRIER_INTEGRATIONS,
  rfq: serverEnvironment.FEATURE_RFQ,
  reviews: serverEnvironment.FEATURE_REVIEWS,
  multiSupplierCheckout: serverEnvironment.FEATURE_MULTI_SUPPLIER_CHECKOUT,
});
