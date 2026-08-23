import "server-only";

import { database } from "@/lib/db/client";
import { serverEnvironment } from "@/lib/env/server";

import { buildTrendyolPreview } from "./trendyol-preview";

export type TrendyolReadinessReason = {
  code:
    | "LIVE_FEATURE_DISABLED"
    | "APPROVED_RESELLER_REQUIRED"
    | "CREDENTIALS_MISSING"
    | "PRODUCT_VALIDATION_FAILED"
    | "REAL_METADATA_MAPPING_REQUIRED"
    | "FAVORITE_PRODUCTS_MISSING";
  message: string;
};

export type TrendyolLiveReadiness = {
  state: "READY" | "BLOCKED";
  reasons: TrendyolReadinessReason[];
  validProducts: number;
  totalProducts: number;
  requiresRealMetadata: boolean;
};

export async function evaluateTrendyolLiveReadiness(
  userId: string,
  organizationId: string,
): Promise<TrendyolLiveReadiness> {
  const [organization, preview] = await Promise.all([
    database.organization.findFirst({
      where: {
        id: organizationId,
        type: { in: ["RESELLER", "BOTH"] },
        status: "ACTIVE",
        verificationStatus: "APPROVED",
        memberships: { some: { userId, status: "ACTIVE" } },
      },
      include: {
        marketplaceConnections: { where: { channel: "TRENDYOL" }, take: 1 },
      },
    }),
    buildTrendyolPreview(userId),
  ]);
  const reasons: TrendyolReadinessReason[] = [];
  if (!organization) {
    reasons.push({
      code: "APPROVED_RESELLER_REQUIRED",
      message: "Canlı Trendyol aktarımı için onaylı alıcı işletmesi gerekir.",
    });
  }
  if (!serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL) {
    reasons.push({
      code: "LIVE_FEATURE_DISABLED",
      message: "Canlı Trendyol aktarımı feature flag ile kapalıdır.",
    });
  }
  if (!organization?.marketplaceConnections[0]?.credentialCiphertext) {
    reasons.push({
      code: "CREDENTIALS_MISSING",
      message: "Satıcı kimliği, API anahtarı ve API secret güvenli bağlantıda tanımlı değil.",
    });
  }
  if (preview.products.length === 0) {
    reasons.push({
      code: "FAVORITE_PRODUCTS_MISSING",
      message: "Önizleme için en az bir stoklu favori ürün seçilmelidir.",
    });
  }
  if (preview.validation.invalidCount > 0) {
    reasons.push({
      code: "PRODUCT_VALIDATION_FAILED",
      message: "Kategori, marka, özellik, barkod, stok veya HTTPS görsel doğrulaması tamamlanmadı.",
    });
  }
  const requiresRealMetadata = preview.products.some(
    (product) =>
      product.mappingSources.category !== "LIVE" ||
      product.mappingSources.brand !== "LIVE" ||
      product.mappingSources.attributes.some((source) => source !== "LIVE"),
  );
  if (requiresRealMetadata) {
    reasons.push({
      code: "REAL_METADATA_MAPPING_REQUIRED",
      message:
        "Canlı aktarım için kategori, marka ve özellik eşleşmeleri Trendyol’dan alınmış güncel meta veriyle doğrulanmalıdır.",
    });
  }
  return {
    state: reasons.length === 0 ? "READY" : "BLOCKED",
    reasons,
    validProducts: preview.validation.validCount,
    totalProducts: preview.products.length,
    requiresRealMetadata,
  };
}
