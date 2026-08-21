import { requirePlatformOperator } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { verificationTransitionSchema } from "@/modules/organizations/application/schemas";
import { assertVerificationTransition } from "@/modules/verification/domain/state-machine";

type Context = { params: Promise<{ applicationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { applicationId } = await context.params;
    const { user } = await requirePlatformOperator(request);
    const limit = await consumeRateLimit(`admin-verification:${user.id}`, { window: 600, max: 50 });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla doğrulama işlemi.", "RATE_LIMITED");
    const input = verificationTransitionSchema.parse(await parseJsonBody(request));
    const application = await database.verificationApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new HttpError(404, "Başvuru bulunamadı.", "APPLICATION_NOT_FOUND");
    try {
      assertVerificationTransition(application.status, input.status);
    } catch {
      throw new HttpError(409, "Geçersiz doğrulama durumu geçişi.", "INVALID_TRANSITION");
    }

    const now = new Date();
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    await database.$transaction(async (transaction) => {
      const claimed = await transaction.verificationApplication.updateMany({
        where: { id: application.id, status: application.status },
        data: {
          status: input.status,
          reviewedById: user.id,
          reviewedAt: ["APPROVED", "REJECTED"].includes(input.status) ? now : null,
          rejectionReason: input.status === "REJECTED" ? (input.reason ?? null) : null,
          changeRequest: input.status === "NEEDS_CHANGES" ? (input.reason ?? null) : null,
        },
      });
      if (claimed.count !== 1)
        throw new HttpError(409, "Başvuru durumu değişti.", "APPLICATION_STATE_CONFLICT");
      await transaction.organization.update({
        where: { id: application.organizationId },
        data: {
          verificationStatus: input.status,
          ...(input.status === "APPROVED" ? { status: "ACTIVE" as const, verifiedAt: now } : {}),
          ...(input.status === "SUSPENDED"
            ? { status: "SUSPENDED" as const, suspendedAt: now }
            : {}),
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId: application.organizationId,
          action: "verification.status_changed",
          targetType: "VerificationApplication",
          targetId: application.id,
          before: { status: application.status },
          after: { status: input.status, reasonProvided: Boolean(input.reason) },
          ...auditContext,
        }),
      });
    });
    return Response.json({ data: { id: application.id, status: input.status } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Durum geçişi geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
