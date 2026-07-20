import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { assertVerificationTransition } from "@/modules/verification/domain/state-machine";

type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "verification:submit",
    );
    const limit = await consumeRateLimit(`verification-submit:${user.id}:${organizationId}`, {
      window: 3600,
      max: 5,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla başvuru gönderme denemesi.", "RATE_LIMITED");
    const application = await database.verificationApplication.findFirst({
      where: { organizationId, status: { in: ["DRAFT", "NEEDS_CHANGES"] } },
      orderBy: { version: "desc" },
      include: { documents: true },
    });
    if (!application)
      throw new HttpError(409, "Gönderilebilecek başvuru yok.", "APPLICATION_NOT_EDITABLE");
    assertVerificationTransition(application.status, "SUBMITTED");
    const hasHeadquarters = await database.address.count({
      where: { organizationId, type: "HEADQUARTERS" },
    });
    if (
      hasHeadquarters === 0 ||
      !application.documents.some((document) => document.scanStatus === "CLEAN")
    ) {
      throw new HttpError(
        422,
        "Merkez adresi ve temiz en az bir belge gereklidir.",
        "APPLICATION_INCOMPLETE",
      );
    }
    const now = new Date();
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    await database.$transaction(async (transaction) => {
      const claimed = await transaction.verificationApplication.updateMany({
        where: { id: application.id, status: application.status },
        data: { status: "SUBMITTED", submittedAt: now, rejectionReason: null, changeRequest: null },
      });
      if (claimed.count !== 1)
        throw new HttpError(409, "Başvuru durumu değişti.", "APPLICATION_STATE_CONFLICT");
      await transaction.organization.update({
        where: { id: organizationId },
        data: { verificationStatus: "SUBMITTED" },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "verification.submitted",
          targetType: "VerificationApplication",
          targetId: application.id,
          before: { status: application.status },
          after: { status: "SUBMITTED" },
          ...auditContext,
        }),
      });
    });
    return Response.json({ data: { id: application.id, status: "SUBMITTED" } });
  } catch (error) {
    return errorResponse(error);
  }
}
