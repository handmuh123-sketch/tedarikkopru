import "server-only";

import { timingSafeEqual } from "node:crypto";

import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { sha256 } from "@/lib/security/crypto";

import { readMarketplaceCredentials } from "./connection-service";
import type { MarketplaceChannel } from "../domain/types";

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function safeEventId(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) || null;
}

export async function receiveMarketplaceWebhook(input: {
  channel: MarketplaceChannel;
  connectionId: string;
  body: string;
  providedApiKey: string | null;
  externalEventId: string | null;
}) {
  const connection = await database.marketplaceConnection.findFirst({
    where: { id: input.connectionId, channel: input.channel },
    select: { id: true, organizationId: true, credentialCiphertext: true },
  });
  if (!connection)
    throw new HttpError(404, "Webhook bağlantısı bulunamadı.", "WEBHOOK_CONNECTION_NOT_FOUND");
  const credentials = readMarketplaceCredentials(connection.credentialCiphertext);
  const signatureValid = Boolean(
    credentials?.webhookApiKey &&
    input.providedApiKey &&
    secureEqual(credentials.webhookApiKey, input.providedApiKey),
  );
  const eventId = safeEventId(input.externalEventId);
  const payloadHash = sha256(input.body);
  const dedupKey = sha256(`${input.channel}:${connection.id}:${eventId ?? payloadHash}`);
  const existing = await database.webhookInbox.findUnique({
    where: { channel_dedupKey: { channel: input.channel, dedupKey } },
  });
  if (existing) {
    if (!existing.signatureValid)
      throw new HttpError(401, "Webhook imzası doğrulanamadı.", "WEBHOOK_SIGNATURE_INVALID");
    return { accepted: true, duplicate: true, id: existing.id };
  }
  const received = await database.webhookInbox.create({
    data: {
      channel: input.channel,
      connectionId: connection.id,
      organizationId: connection.organizationId,
      dedupKey,
      signatureValid,
      status: signatureValid ? "RECEIVED" : "REJECTED",
      safePayload: { eventId, payloadHash, byteLength: Buffer.byteLength(input.body) },
      safeErrorCode: signatureValid ? null : "SIGNATURE_INVALID",
      processedAt: signatureValid ? new Date() : null,
    },
  });
  if (!signatureValid)
    throw new HttpError(401, "Webhook imzası doğrulanamadı.", "WEBHOOK_SIGNATURE_INVALID");
  const processed = await database.webhookInbox.update({
    where: { id: received.id },
    data: { status: "PROCESSED", processedAt: new Date() },
  });
  return { accepted: true, duplicate: false, id: processed.id };
}

export async function replayMarketplaceWebhook(input: {
  webhookId: string;
  actorId: string;
  requestId: string;
  network?: string;
}) {
  const existing = await database.webhookInbox.findFirst({
    where: { id: input.webhookId, signatureValid: true },
  });
  if (!existing) throw new HttpError(404, "Webhook kaydı bulunamadı.", "WEBHOOK_NOT_FOUND");
  return database.$transaction(async (transaction) => {
    const replayed = await transaction.webhookInbox.update({
      where: { id: existing.id },
      data: {
        status: "PROCESSED",
        retryCount: { increment: 1 },
        processedAt: new Date(),
        safeErrorCode: null,
      },
    });
    const auditInput = {
      actorId: input.actorId,
      action: "marketplace.webhook_replayed",
      targetType: "WebhookInbox",
      targetId: existing.id,
      after: { channel: existing.channel, retryCount: replayed.retryCount },
      requestId: input.requestId,
    };
    const network = input.network ? { network: input.network } : {};
    const organization = existing.organizationId ? { organizationId: existing.organizationId } : {};
    await transaction.auditLog.create({
      data: buildAuditLogData({ ...auditInput, ...organization, ...network }),
    });
    return replayed;
  });
}
