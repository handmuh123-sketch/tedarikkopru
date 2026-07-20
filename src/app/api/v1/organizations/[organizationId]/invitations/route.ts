import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { invitationEmail, sendApplicationEmail } from "@/lib/email/sender";
import { serverEnvironment } from "@/lib/env/server";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { createOpaqueToken } from "@/lib/security/crypto";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/modules/audit/audit-service";
import { invitationSchema } from "@/modules/organizations/application/schemas";
import { canAssignRole } from "@/modules/organizations/domain/permissions";

type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user, membership } = await requireOrganizationPermission(
      request,
      organizationId,
      "member:manage",
    );
    const limit = await consumeRateLimit(`invitation:${user.id}:${organizationId}`, {
      window: 3600,
      max: 20,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla davet denemesi.", "RATE_LIMITED");
    const input = invitationSchema.parse(await parseJsonBody(request));
    if (!canAssignRole(membership.role, input.role))
      throw new HttpError(403, "Bu rol için davet gönderemezsiniz.", "ROLE_ASSIGNMENT_FORBIDDEN");
    const organization = await database.organization.findUnique({
      where: { id: organizationId },
      select: { legalName: true },
    });
    if (!organization) throw new HttpError(404, "İşletme bulunamadı.", "ORGANIZATION_NOT_FOUND");
    const { token, tokenHash } = createOpaqueToken();
    const invitation = await database.organizationInvitation.create({
      data: {
        organizationId,
        email: input.email,
        role: input.role,
        tokenHash,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    });
    await sendApplicationEmail(
      invitationEmail(
        input.email,
        `${serverEnvironment.APP_URL}/davet?token=${encodeURIComponent(token)}`,
        organization.legalName,
      ),
    );
    await writeAuditLog({
      actorId: user.id,
      organizationId,
      action: "invitation.created",
      targetType: "OrganizationInvitation",
      targetId: invitation.id,
      after: invitation,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Davet bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
