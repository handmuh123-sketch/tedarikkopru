import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { brandUpdateSchema } from "@/modules/catalog/application/schemas";

type Context = { params: Promise<{ brandId: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const { brandId } = await context.params;
    const input = brandUpdateSchema.parse(await parseJsonBody(request));
    const current = await database.brand.findUnique({ where: { id: brandId } });
    if (!current) throw new HttpError(404, "Marka bulunamadı.", "BRAND_NOT_FOUND");
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const updateData = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };
    const brand = await database.$transaction(async (transaction) => {
      const updated = await transaction.brand.update({ where: { id: brandId }, data: updateData });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "catalog.brand_updated",
          targetType: "Brand",
          targetId: brandId,
          before: { name: current.name, status: current.status },
          after: { name: updated.name, status: updated.status },
          ...auditContext,
        }),
      });
      return updated;
    });
    return Response.json({ data: brand });
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
