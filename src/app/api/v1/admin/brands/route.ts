import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { brandCreateSchema } from "@/modules/catalog/application/schemas";

export async function GET(request: Request) {
  try {
    await requireCatalogAdmin(request);
    return Response.json({ data: await database.brand.findMany({ orderBy: { name: "asc" } }) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const input = brandCreateSchema.parse(await parseJsonBody(request));
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const brand = await database.$transaction(async (transaction) => {
      const created = await transaction.brand.create({ data: input });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "catalog.brand_created",
          targetType: "Brand",
          targetId: created.id,
          after: { name: created.name, slug: created.slug, status: created.status },
          ...auditContext,
        }),
      });
      return created;
    });
    return Response.json({ data: brand }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        new HttpError(409, "Marka kısa adı zaten kullanılıyor.", "BRAND_CONFLICT"),
      );
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Marka bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
