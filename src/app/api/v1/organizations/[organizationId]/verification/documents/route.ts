import { z } from "zod";

import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { putPrivateDocument } from "@/lib/storage/private-documents";
import { buildAuditLogData } from "@/modules/audit/audit-service";

const typeSchema = z.enum([
  "TAX_CERTIFICATE",
  "AUTHORIZED_SIGNATURE",
  "TRADE_REGISTRY",
  "CRAFTSMAN_REGISTRY",
  "IBAN_PROOF",
  "BRAND_AUTHORIZATION",
]);
type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "document:manage",
    );
    const limit = await consumeRateLimit(`document-upload:${user.id}:${organizationId}`, {
      window: 600,
      max: 20,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla belge yükleme denemesi.", "RATE_LIMITED");
    const formData = await request.formData();
    const file = formData.get("file");
    const type = typeSchema.parse(formData.get("type"));
    if (!(file instanceof File))
      throw new HttpError(422, "Belge dosyası gerekli.", "FILE_REQUIRED");

    const application = await database.verificationApplication.findFirst({
      where: { organizationId, status: { in: ["DRAFT", "NEEDS_CHANGES"] } },
      orderBy: { version: "desc" },
      select: { id: true },
    });
    if (!application)
      throw new HttpError(409, "Belge eklenebilecek açık başvuru yok.", "APPLICATION_NOT_EDITABLE");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let stored: { storageKey: string; checksum: string };
    try {
      stored = await putPrivateDocument(organizationId, bytes, file.type);
    } catch (error) {
      throw new HttpError(
        422,
        error instanceof Error ? error.message : "Belge geçersiz.",
        "INVALID_DOCUMENT",
      );
    }
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const document = await database.$transaction(async (transaction) => {
      const editableApplication = await transaction.verificationApplication.findFirst({
        where: { id: application.id, organizationId, status: { in: ["DRAFT", "NEEDS_CHANGES"] } },
        select: { id: true },
      });
      if (!editableApplication)
        throw new HttpError(409, "Başvuru durumu değişti.", "APPLICATION_STATE_CONFLICT");
      const created = await transaction.verificationDocument.create({
        data: {
          applicationId: application.id,
          type,
          storageKey: stored.storageKey,
          originalName: file.name.slice(0, 255),
          mimeType: file.type,
          size: bytes.byteLength,
          checksum: stored.checksum,
          scanStatus: "CLEAN",
        },
        select: {
          id: true,
          type: true,
          originalName: true,
          mimeType: true,
          size: true,
          checksum: true,
          scanStatus: true,
          createdAt: true,
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "verification_document.uploaded",
          targetType: "VerificationDocument",
          targetId: created.id,
          after: {
            id: created.id,
            type: created.type,
            size: created.size,
            checksum: created.checksum,
            scanStatus: created.scanStatus,
          },
          ...auditContext,
        }),
      });
      return created;
    });
    return Response.json({ data: document }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Belge türü geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
