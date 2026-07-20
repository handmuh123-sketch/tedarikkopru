import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { keyedHash } from "@/lib/security/crypto";

const blockedKeys =
  /email|phone|address|tax|vkn|mersis|kep|token|password|secret|iban|storageKey|originalName/i;

export function redactAuditValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => redactAuditValue(item) ?? null);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        blockedKeys.test(key) ? "[REDACTED]" : (redactAuditValue(nested) ?? null),
      ]),
    );
  }
  return String(value);
}

export type AuditInput = {
  actorId?: string;
  organizationId?: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  requestId: string;
  network?: string;
};

export function buildAuditLogData(input: AuditInput): Prisma.AuditLogUncheckedCreateInput {
  const data: Prisma.AuditLogUncheckedCreateInput = {
    actorType: input.actorId ? "USER" : "SYSTEM",
    actorId: input.actorId ?? null,
    organizationId: input.organizationId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    ipHash: input.network ? keyedHash(`audit-ip:${input.network}`) : null,
    requestId: input.requestId,
  };
  const beforeRedacted = redactAuditValue(input.before);
  const afterRedacted = redactAuditValue(input.after);
  if (beforeRedacted !== undefined) data.beforeRedacted = beforeRedacted;
  if (afterRedacted !== undefined) data.afterRedacted = afterRedacted;
  return data;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await database.auditLog.create({
    data: buildAuditLogData(input),
  });
}
