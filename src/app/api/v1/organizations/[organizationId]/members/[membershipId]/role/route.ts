import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { membershipRoleSchema } from "@/modules/organizations/application/schemas";
import { canAssignRole } from "@/modules/organizations/domain/permissions";

type Context = { params: Promise<{ organizationId: string; membershipId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { organizationId, membershipId } = await context.params;
    const { user, membership: actorMembership } = await requireOrganizationPermission(
      request,
      organizationId,
      "member:manage",
    );
    const { role } = membershipRoleSchema.parse(await parseJsonBody(request));
    if (!canAssignRole(actorMembership.role, role))
      throw new HttpError(403, "Bu rolü atayamazsınız.", "ROLE_ASSIGNMENT_FORBIDDEN");

    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const updated = await database.$transaction(async (transaction) => {
      // Serialize role changes per organization so concurrent owner demotions
      // cannot both pass the last-owner check.
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))::text`;
      const target = await transaction.organizationMembership.findFirst({
        where: { id: membershipId, organizationId },
      });
      if (!target) throw new HttpError(404, "Üyelik bulunamadı.", "MEMBERSHIP_NOT_FOUND");
      if (target.role === "OWNER" && role !== "OWNER") {
        const ownerCount = await transaction.organizationMembership.count({
          where: { organizationId, role: "OWNER", status: "ACTIVE" },
        });
        if (ownerCount <= 1)
          throw new HttpError(409, "Son işletme sahibi rolü kaldırılamaz.", "LAST_OWNER");
      }
      const membership = await transaction.organizationMembership.update({
        where: { id: target.id },
        data: { role },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "membership.role_changed",
          targetType: "OrganizationMembership",
          targetId: target.id,
          before: { role: target.role },
          after: { role: membership.role },
          ...auditContext,
        }),
      });
      return membership;
    });
    return Response.json({ data: { id: updated.id, role: updated.role } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Rol geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
