import { z } from "zod";

import { requireUser } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { sha256 } from "@/lib/security/crypto";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/modules/audit/audit-service";

const schema = z.object({ token: z.string().min(40).max(100) });

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const limit = await consumeRateLimit(`invite-accept:${user.id}`, { window: 600, max: 10 });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla davet denemesi.", "RATE_LIMITED");
    const { token } = schema.parse(await parseJsonBody(request));
    const invitation = await database.organizationInvitation.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.expiresAt <= new Date() ||
      invitation.email !== user.email.toLowerCase()
    ) {
      throw new HttpError(404, "Geçerli davet bulunamadı.", "INVITATION_NOT_FOUND");
    }
    const membership = await database.$transaction(async (transaction) => {
      const created = await transaction.organizationMembership.upsert({
        where: {
          organizationId_userId: { organizationId: invitation.organizationId, userId: user.id },
        },
        update: {
          role: invitation.role,
          status: "ACTIVE",
          joinedAt: new Date(),
          invitedById: invitation.invitedById,
        },
        create: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          status: "ACTIVE",
          joinedAt: new Date(),
          invitedById: invitation.invitedById,
        },
      });
      await transaction.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), tokenHash: sha256(`used:${token}`) },
      });
      return created;
    });
    await writeAuditLog({
      actorId: user.id,
      organizationId: invitation.organizationId,
      action: "invitation.accepted",
      targetType: "OrganizationMembership",
      targetId: membership.id,
      after: { role: membership.role },
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: { organizationId: invitation.organizationId } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Davet anahtarı geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
