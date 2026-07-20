import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "member:manage");
    const members = await database.organizationMembership.findMany({
      where: { organizationId },
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ data: members });
  } catch (error) {
    return errorResponse(error);
  }
}
