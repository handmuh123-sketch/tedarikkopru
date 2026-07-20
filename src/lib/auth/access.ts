import "server-only";

import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import {
  hasOrganizationPermission,
  type OrganizationPermission,
} from "@/modules/organizations/domain/permissions";

const adminRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "PLATFORM_OPERATIONS",
  "PLATFORM_SUPPORT",
]);

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Oturum açmanız gerekiyor.", "UNAUTHENTICATED");

  const user = await database.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE", deletedAt: null },
    select: { id: true, email: true, name: true, platformRole: true, status: true },
  });
  if (!user) throw new HttpError(401, "Oturum artık geçerli değil.", "SESSION_INVALID");
  return { session, user };
}

export async function requirePlatformAdmin(request: Request) {
  const context = await requireUser(request);
  if (!adminRoles.has(context.user.platformRole)) {
    throw new HttpError(403, "Bu işlem için platform yetkisi gerekiyor.", "FORBIDDEN");
  }
  return context;
}

export async function requireOrganizationPermission(
  request: Request,
  organizationId: string,
  permission: OrganizationPermission,
) {
  const context = await requireUser(request);
  const membership = await database.organizationMembership.findFirst({
    where: {
      organizationId,
      userId: context.user.id,
      status: "ACTIVE",
      organization: { status: { not: "ARCHIVED" } },
    },
    select: { id: true, organizationId: true, role: true },
  });
  if (!membership || !hasOrganizationPermission(membership.role, permission)) {
    throw new HttpError(404, "İşletme bulunamadı.", "ORGANIZATION_NOT_FOUND");
  }
  return { ...context, membership };
}
