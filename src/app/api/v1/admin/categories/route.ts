import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { categoryCreateSchema } from "@/modules/catalog/application/schemas";

export async function GET(request: Request) {
  try {
    await requireCatalogAdmin(request);
    return Response.json({
      data: await database.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const input = categoryCreateSchema.parse(await parseJsonBody(request));
    const parent = input.parentId
      ? await database.category.findUnique({ where: { id: input.parentId } })
      : null;
    if (input.parentId && !parent)
      throw new HttpError(422, "Üst kategori bulunamadı.", "PARENT_NOT_FOUND");
    const path = parent ? `${parent.path}/${input.slug}` : input.slug;
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const category = await database.$transaction(async (transaction) => {
      const created = await transaction.category.create({
        data: { ...input, parentId: input.parentId ?? null, path },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "catalog.category_created",
          targetType: "Category",
          targetId: created.id,
          after: { name: created.name, slug: created.slug, isActive: created.isActive },
          ...auditContext,
        }),
      });
      return created;
    });
    return Response.json({ data: category }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        new HttpError(409, "Kategori kısa adı zaten kullanılıyor.", "CATEGORY_CONFLICT"),
      );
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Kategori bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
