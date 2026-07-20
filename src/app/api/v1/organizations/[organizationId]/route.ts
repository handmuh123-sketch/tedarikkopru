import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/modules/audit/audit-service";
import { organizationUpdateSchema } from "@/modules/organizations/application/schemas";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "organization:read");
    const organization = await database.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        legalName: true,
        tradeName: true,
        slug: true,
        taxOffice: true,
        mersisNumber: true,
        kepAddress: true,
        website: true,
        phone: true,
        email: true,
        sector: true,
        authorizedPerson: true,
        status: true,
        verificationStatus: true,
        createdAt: true,
        addresses: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!organization) throw new HttpError(404, "İşletme bulunamadı.", "ORGANIZATION_NOT_FOUND");
    return Response.json({ data: organization });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "organization:update",
    );
    const input = organizationUpdateSchema.parse(await parseJsonBody(request));
    const before = await database.organization.findUnique({
      where: { id: organizationId },
      select: { legalName: true, tradeName: true, status: true },
    });
    const organization = await database.organization.update({
      where: { id: organizationId },
      data: Object.fromEntries(Object.entries(input).filter((entry) => entry[1] !== undefined)),
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        status: true,
        verificationStatus: true,
      },
    });
    await writeAuditLog({
      actorId: user.id,
      organizationId,
      action: "organization.updated",
      targetType: "Organization",
      targetId: organizationId,
      before,
      after: organization,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: organization });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "İşletme bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
