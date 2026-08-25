import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { serverEnvironment } from "@/lib/env/server";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { database } from "@/lib/db/client";

import { marketplaceAdapter } from "../adapters/registry";
import { stableMarketplaceRequestHash } from "../domain/marketplace-rules";
import type { MarketplacePublishResult } from "../domain/types";
import { readMarketplaceCredentials } from "./connection-service";
import { buildTrendyolPreview } from "./trendyol-preview";
import { evaluateTrendyolLiveReadiness } from "./trendyol-readiness";

type PublishAuditContext = {
  actorId: string;
  organizationId: string;
  requestId: string;
  network?: string;
};

export type MarketplaceSyncJobView = {
  id: string;
  channel: string;
  type: string;
  status: string;
  itemCount: number;
  successCount: number;
  failureCount: number;
  providerRequestId: string | null;
  safeErrorSummary: string | null;
  createdAt: Date;
  finishedAt: Date | null;
};

function jobView(job: {
  id: string;
  channel: string;
  type: string;
  status: string;
  itemCount: number;
  successCount: number;
  failureCount: number;
  providerRequestId: string | null;
  safeErrorSummary: string | null;
  createdAt: Date;
  finishedAt: Date | null;
}): MarketplaceSyncJobView {
  return {
    id: job.id,
    channel: job.channel,
    type: job.type,
    status: job.status,
    itemCount: job.itemCount,
    successCount: job.successCount,
    failureCount: job.failureCount,
    providerRequestId: job.providerRequestId,
    safeErrorSummary: job.safeErrorSummary,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
  };
}

function safeSummary(result: MarketplacePublishResult): string | null {
  const issue = result.errors[0] ?? result.warnings[0];
  return issue ? `${issue.code}: ${issue.message}`.slice(0, 500) : null;
}

function retryable(result: MarketplacePublishResult): boolean {
  return result.errors.some((error) =>
    ["PROVIDER_TEMPORARY", "PROVIDER_UNAVAILABLE", "RATE_LIMITED"].includes(error.code),
  );
}

async function publishWithRetry(
  publish: () => Promise<MarketplacePublishResult>,
  onRetry: () => Promise<void>,
): Promise<MarketplacePublishResult> {
  let result = await publish();
  for (const delay of [100, 300]) {
    if (!retryable(result)) return result;
    await onRetry();
    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await publish();
  }
  return result;
}

export async function publishFavoriteProducts(
  connectionId: string,
  idempotencyKey: string,
  audit: PublishAuditContext,
): Promise<{ job: MarketplaceSyncJobView; reused: boolean }> {
  const connection = await database.marketplaceConnection.findFirst({
    where: { id: connectionId, organizationId: audit.organizationId, channel: "TRENDYOL" },
  });
  if (!connection)
    throw new HttpError(404, "Trendyol bağlantısı bulunamadı.", "MARKETPLACE_CONNECTION_NOT_FOUND");
  if (connection.status === "DISCONNECTED")
    throw new HttpError(
      409,
      "Önce Trendyol bağlantısını yapılandırın.",
      "MARKETPLACE_CONNECTION_DISCONNECTED",
    );
  if (serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL) {
    const readiness = await evaluateTrendyolLiveReadiness(audit.actorId, audit.organizationId);
    if (readiness.state !== "READY") {
      throw new HttpError(
        409,
        readiness.reasons[0]?.message ?? "Trendyol canlı aktarımı henüz hazır değil.",
        "MARKETPLACE_LIVE_NOT_READY",
      );
    }
  }

  const preview = await buildTrendyolPreview(audit.actorId);
  const requestHash = stableMarketplaceRequestHash({
    connectionId,
    products: preview.products.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      payload: item.payload,
    })),
  });
  const created = await database.$transaction(async (transaction) => {
    const existing = await transaction.marketplaceSyncJob.findUnique({
      where: {
        organizationId_connectionId_idempotencyKey: {
          organizationId: audit.organizationId,
          connectionId,
          idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new HttpError(
          409,
          "Bu idempotency anahtarı farklı bir yayın isteğiyle kullanıldı.",
          "MARKETPLACE_IDEMPOTENCY_CONFLICT",
        );
      await transaction.auditLog.create({
        data: buildAuditLogData({
          ...audit,
          action: "marketplace.publish_replayed",
          targetType: "MarketplaceSyncJob",
          targetId: existing.id,
          after: { status: existing.status },
        }),
      });
      return { job: existing, reused: true };
    }
    const job = await transaction.marketplaceSyncJob.create({
      data: {
        connectionId,
        organizationId: audit.organizationId,
        channel: "TRENDYOL",
        type: "PRODUCT_PUBLISH",
        idempotencyKey,
        requestHash,
        itemCount: preview.products.length,
        startedAt: new Date(),
      },
    });
    if (preview.products.length > 0) {
      await transaction.marketplaceSyncItem.createMany({
        data: preview.products.map((item) => ({
          jobId: job.id,
          productId: item.productId,
          variantId: item.variantId,
          status: item.validation.valid ? "PENDING" : "FAILED",
          safeErrorCode: item.validation.valid
            ? null
            : (item.validation.errors[0]?.code ?? "MAPPING_INVALID"),
          safeErrorMessage: item.validation.valid
            ? null
            : (item.validation.errors[0]?.message ?? "Ürün mapping doğrulamasını geçemedi."),
          payloadSnapshot: item.payload ? (item.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
        })),
      });
    }
    await transaction.auditLog.create({
      data: buildAuditLogData({
        ...audit,
        action: "marketplace.publish_requested",
        targetType: "MarketplaceSyncJob",
        targetId: job.id,
        after: {
          channel: "TRENDYOL",
          itemCount: preview.products.length,
          validCount: preview.validation.validCount,
          invalidCount: preview.validation.invalidCount,
          liveEnabled: serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL,
        },
      }),
    });
    return { job, reused: false };
  });
  if (created.reused) return { job: jobView(created.job), reused: true };

  const validItems = preview.products.filter(
    (item): item is typeof item & { payload: Record<string, unknown> } =>
      item.validation.valid && item.payload !== null,
  );
  const credentials = readMarketplaceCredentials(connection.credentialCiphertext);
  if (serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL && !credentials) {
    await database.marketplaceSyncJob.update({
      where: { id: created.job.id },
      data: {
        status: "FAILED",
        failureCount: preview.products.length,
        safeErrorSummary: "CREDENTIALS_MISSING: Pazaryeri bağlantı kimlik bilgileri eksik.",
        finishedAt: new Date(),
      },
    });
    throw new HttpError(
      409,
      "Canlı aktarım için pazaryeri kimlik bilgileri eksik.",
      "MARKETPLACE_CREDENTIALS_REQUIRED",
    );
  }

  const adapter = marketplaceAdapter("TRENDYOL");
  const result = await publishWithRetry(
    () => {
      if (!credentials)
        return adapter.publishProducts(
          { sellerId: "preview", apiKey: "preview", apiSecret: "preview", environment: "STAGE" },
          validItems.map((item) => item.payload),
        );
      return adapter.publishProducts(
        credentials,
        validItems.map((item) => item.payload),
      );
    },
    async () => {
      await database.auditLog.create({
        data: buildAuditLogData({
          ...audit,
          action: "marketplace.publish_retry",
          targetType: "MarketplaceSyncJob",
          targetId: created.job.id,
          after: { channel: "TRENDYOL" },
        }),
      });
    },
  );
  const failedCount = preview.validation.invalidCount + (result.success ? 0 : validItems.length);
  const status =
    result.mode === "PREVIEW"
      ? "PREVIEW"
      : result.success
        ? failedCount > 0
          ? "PARTIAL"
          : "SUCCEEDED"
        : "FAILED";
  const job = await database.$transaction(async (transaction) => {
    await transaction.marketplaceSyncJob.update({
      where: { id: created.job.id },
      data: {
        status,
        successCount: result.mode === "LIVE" && result.success ? validItems.length : 0,
        failureCount: failedCount,
        providerRequestId: result.batchRequestId,
        safeErrorSummary: safeSummary(result),
        finishedAt: new Date(),
      },
    });
    for (const item of validItems) {
      await transaction.marketplaceSyncItem.updateMany({
        where: { jobId: created.job.id, productId: item.productId, variantId: item.variantId },
        data: {
          status: result.mode === "PREVIEW" ? "PREVIEW" : result.success ? "SUCCEEDED" : "FAILED",
          externalId: result.batchRequestId,
          safeErrorCode: result.success
            ? null
            : (result.errors[0]?.code ?? "PROVIDER_REQUEST_FAILED"),
          safeErrorMessage: result.success
            ? null
            : (result.errors[0]?.message ?? "Pazaryeri isteği tamamlanamadı."),
        },
      });
    }
    return transaction.marketplaceSyncJob.findUniqueOrThrow({ where: { id: created.job.id } });
  });
  return { job: jobView(job), reused: false };
}
