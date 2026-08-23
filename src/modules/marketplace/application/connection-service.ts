import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { decryptSensitive, encryptSensitive, keyedHash } from "@/lib/security/crypto";

import { marketplaceAdapter } from "../adapters/registry";
import type { MarketplaceConnectionCredentials, MarketplaceChannel } from "../domain/types";

type AuditContext = {
  actorId: string;
  organizationId: string;
  requestId: string;
  network?: string;
};

type MarketplaceCredentialsPatch = {
  sellerId?: string | undefined;
  apiKey?: string | undefined;
  apiSecret?: string | undefined;
  environment?: MarketplaceConnectionCredentials["environment"] | undefined;
  shipmentAddressId?: number | undefined;
  returningAddressId?: number | undefined;
  webhookApiKey?: string | undefined;
};

type ConnectionInput = {
  channel: MarketplaceChannel;
  displayName?: string | undefined;
  credentials?: MarketplaceCredentialsPatch | undefined;
};

export type MarketplaceConnectionView = {
  id: string;
  channel: MarketplaceChannel;
  status: string;
  displayName: string;
  credentialsConfigured: boolean;
  lastHealthCheckAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function connectionView(connection: {
  id: string;
  channel: MarketplaceChannel;
  status: string;
  displayName: string;
  credentialCiphertext: string | null;
  lastHealthCheckAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MarketplaceConnectionView {
  return {
    id: connection.id,
    channel: connection.channel,
    status: connection.status,
    displayName: connection.displayName,
    credentialsConfigured: Boolean(connection.credentialCiphertext),
    lastHealthCheckAt: connection.lastHealthCheckAt,
    lastSuccessAt: connection.lastSuccessAt,
    lastErrorCode: connection.lastErrorCode,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

function normalizedCredentials(
  existing: MarketplaceConnectionCredentials | null,
  input: MarketplaceCredentialsPatch | undefined,
): MarketplaceConnectionCredentials | null {
  if (!input) return existing;
  const next = {
    sellerId: input.sellerId ?? existing?.sellerId,
    apiKey: input.apiKey ?? existing?.apiKey,
    apiSecret: input.apiSecret ?? existing?.apiSecret,
    environment: input.environment ?? existing?.environment ?? "STAGE",
    shipmentAddressId: input.shipmentAddressId ?? existing?.shipmentAddressId,
    returningAddressId: input.returningAddressId ?? existing?.returningAddressId,
    webhookApiKey: input.webhookApiKey ?? existing?.webhookApiKey,
  };
  if (!next.sellerId || !next.apiKey || !next.apiSecret) {
    if (existing) return existing;
    throw new HttpError(
      422,
      "Bağlantı için satıcı kimliği, API anahtarı ve API secret gereklidir.",
      "MARKETPLACE_CREDENTIALS_REQUIRED",
    );
  }
  return next as MarketplaceConnectionCredentials;
}

export function readMarketplaceCredentials(
  credentialCiphertext: string | null,
): MarketplaceConnectionCredentials | null {
  if (!credentialCiphertext) return null;
  try {
    const parsed = JSON.parse(
      decryptSensitive(credentialCiphertext),
    ) as MarketplaceConnectionCredentials;
    if (!parsed.sellerId || !parsed.apiKey || !parsed.apiSecret) return null;
    return parsed;
  } catch {
    throw new HttpError(
      409,
      "Pazaryeri bağlantı kimlik bilgileri okunamadı; güvenli güncelleme gerekir.",
      "MARKETPLACE_CREDENTIALS_INVALID",
    );
  }
}

async function ensureMarketplaceOrganization(organizationId: string) {
  const organization = await database.organization.findFirst({
    where: {
      id: organizationId,
      type: { in: ["RESELLER", "BOTH"] },
      status: "ACTIVE",
      verificationStatus: "APPROVED",
    },
    select: { id: true },
  });
  if (!organization)
    throw new HttpError(
      404,
      "Pazaryeri bağlantısı için onaylı alıcı işletme bulunamadı.",
      "MARKETPLACE_ORGANIZATION_NOT_FOUND",
    );
}

function connectionFingerprint(credentials: MarketplaceConnectionCredentials): string {
  return keyedHash(`marketplace:${credentials.sellerId}:${credentials.apiKey}`);
}

export async function listMarketplaceConnections(
  organizationId: string,
): Promise<MarketplaceConnectionView[]> {
  await ensureMarketplaceOrganization(organizationId);
  const connections = await database.marketplaceConnection.findMany({
    where: { organizationId },
    orderBy: { channel: "asc" },
  });
  return connections.map(connectionView);
}

export async function createMarketplaceConnection(
  input: ConnectionInput,
  audit: AuditContext,
): Promise<MarketplaceConnectionView> {
  await ensureMarketplaceOrganization(audit.organizationId);
  const credentials = normalizedCredentials(null, input.credentials);
  try {
    const connection = await database.$transaction(async (transaction) => {
      const created = await transaction.marketplaceConnection.create({
        data: {
          organizationId: audit.organizationId,
          channel: input.channel,
          status: credentials ? "DRAFT" : "DISCONNECTED",
          displayName: input.displayName ?? input.channel,
          credentialCiphertext: credentials ? encryptSensitive(JSON.stringify(credentials)) : null,
          credentialFingerprint: credentials ? connectionFingerprint(credentials) : null,
          safeMetadata: credentials
            ? ({
                environment: credentials.environment,
                credentialConfigured: true,
              } satisfies Prisma.InputJsonValue)
            : ({} satisfies Prisma.InputJsonValue),
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          ...audit,
          action: "marketplace.connection_created",
          targetType: "MarketplaceConnection",
          targetId: created.id,
          after: { channel: created.channel, credentialsConfigured: Boolean(credentials) },
        }),
      });
      return created;
    });
    return connectionView(connection);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new HttpError(
        409,
        "Bu kanal için bağlantı zaten mevcut.",
        "MARKETPLACE_CONNECTION_EXISTS",
      );
    throw error;
  }
}

export async function updateMarketplaceConnection(
  connectionId: string,
  input: Omit<ConnectionInput, "channel">,
  audit: AuditContext,
): Promise<MarketplaceConnectionView> {
  const existing = await database.marketplaceConnection.findFirst({
    where: { id: connectionId, organizationId: audit.organizationId },
  });
  if (!existing)
    throw new HttpError(
      404,
      "Pazaryeri bağlantısı bulunamadı.",
      "MARKETPLACE_CONNECTION_NOT_FOUND",
    );
  const existingCredentials = readMarketplaceCredentials(existing.credentialCiphertext);
  const credentials = normalizedCredentials(existingCredentials, input.credentials);
  const rotateCredentials = Boolean(input.credentials);
  const connection = await database.$transaction(async (transaction) => {
    const data: Prisma.MarketplaceConnectionUpdateInput = {
      displayName: input.displayName ?? existing.displayName,
      status: credentials ? "DRAFT" : existing.status,
    };
    if (rotateCredentials && credentials) {
      data.credentialCiphertext = encryptSensitive(JSON.stringify(credentials));
      data.credentialFingerprint = connectionFingerprint(credentials);
      data.safeMetadata = {
        environment: credentials.environment,
        credentialConfigured: true,
      };
      data.lastErrorCode = null;
    }
    const updated = await transaction.marketplaceConnection.update({
      where: { id: existing.id },
      data,
    });
    await transaction.auditLog.create({
      data: buildAuditLogData({
        ...audit,
        action: rotateCredentials
          ? "marketplace.connection_credentials_rotated"
          : "marketplace.connection_updated",
        targetType: "MarketplaceConnection",
        targetId: updated.id,
        before: {
          status: existing.status,
          credentialsConfigured: Boolean(existing.credentialCiphertext),
        },
        after: { status: updated.status, credentialsConfigured: Boolean(credentials) },
      }),
    });
    return updated;
  });
  return connectionView(connection);
}

export async function disconnectMarketplaceConnection(
  connectionId: string,
  audit: AuditContext,
): Promise<MarketplaceConnectionView> {
  const existing = await database.marketplaceConnection.findFirst({
    where: { id: connectionId, organizationId: audit.organizationId },
  });
  if (!existing)
    throw new HttpError(
      404,
      "Pazaryeri bağlantısı bulunamadı.",
      "MARKETPLACE_CONNECTION_NOT_FOUND",
    );
  const connection = await database.$transaction(async (transaction) => {
    const updated = await transaction.marketplaceConnection.update({
      where: { id: existing.id },
      data: {
        status: "DISCONNECTED",
        credentialCiphertext: null,
        credentialFingerprint: null,
        safeMetadata: {},
        lastErrorCode: null,
      },
    });
    await transaction.auditLog.create({
      data: buildAuditLogData({
        ...audit,
        action: "marketplace.connection_disconnected",
        targetType: "MarketplaceConnection",
        targetId: updated.id,
        before: {
          status: existing.status,
          credentialsConfigured: Boolean(existing.credentialCiphertext),
        },
        after: { status: updated.status, credentialsConfigured: false },
      }),
    });
    return updated;
  });
  return connectionView(connection);
}

export async function testMarketplaceConnection(
  connectionId: string,
  audit: AuditContext,
): Promise<{ connection: MarketplaceConnectionView; mode: "LIVE" | "PREVIEW"; valid: boolean }> {
  const existing = await database.marketplaceConnection.findFirst({
    where: { id: connectionId, organizationId: audit.organizationId },
  });
  if (!existing)
    throw new HttpError(
      404,
      "Pazaryeri bağlantısı bulunamadı.",
      "MARKETPLACE_CONNECTION_NOT_FOUND",
    );
  const health = await marketplaceAdapter(existing.channel).validateConnection(
    readMarketplaceCredentials(existing.credentialCiphertext),
  );
  const connection = await database.$transaction(async (transaction) => {
    const data: Prisma.MarketplaceConnectionUpdateInput = {
      status: health.valid ? (health.mode === "LIVE" ? "CONNECTED" : "DRAFT") : "ERROR",
      lastHealthCheckAt: new Date(),
      lastErrorCode: health.valid ? null : (health.code ?? "CONNECTION_TEST_FAILED"),
    };
    if (health.valid && health.mode === "LIVE") data.lastSuccessAt = new Date();
    const updated = await transaction.marketplaceConnection.update({
      where: { id: existing.id },
      data,
    });
    await transaction.auditLog.create({
      data: buildAuditLogData({
        ...audit,
        action: "marketplace.connection_tested",
        targetType: "MarketplaceConnection",
        targetId: updated.id,
        after: { mode: health.mode, valid: health.valid, code: health.code ?? null },
      }),
    });
    return updated;
  });
  return { connection: connectionView(connection), mode: health.mode, valid: health.valid };
}
