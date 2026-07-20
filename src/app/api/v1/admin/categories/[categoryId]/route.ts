import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { categoryUpdateSchema } from "@/modules/catalog/application/schemas";

type Context = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const { categoryId } = await context.params;
    const input = categoryUpdateSchema.parse(await parseJsonBody(request));
    const current = await database.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { children: true } } },
    });
    if (!current) throw new HttpError(404, "Kategori bulunamadı.", "CATEGORY_NOT_FOUND");
    if (current._count.children > 0 && (input.slug || input.parentId !== undefined))
      throw new HttpError(
        409,
        "Alt kategorisi olan kaydın yolu değiştirilemez.",
        "CATEGORY_HAS_CHILDREN",
      );
    if (input.parentId === categoryId)
      throw new HttpError(422, "Kategori kendisinin altına taşınamaz.", "CATEGORY_CYCLE");
    const targetParentId = input.parentId !== undefined ? input.parentId : current.parentId;
    const parent = targetParentId
      ? await database.category.findUnique({ where: { id: targetParentId } })
      : null;
    if (targetParentId && !parent)
      throw new HttpError(422, "Üst kategori bulunamadı.", "PARENT_NOT_FOUND");
    if (parent && parent.path.startsWith(`${current.path}/`))
      throw new HttpError(422, "Kategori kendi altına taşınamaz.", "CATEGORY_CYCLE");
    const slug = input.slug ?? current.slug;
    const path = parent ? `${parent.path}/${slug}` : slug;
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const updateData = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId ?? null } : {}),
      path,
    };
    const category = await database.$transaction(async (transaction) => {
      const updated = await transaction.category.update({
        where: { id: categoryId },
        data: updateData,
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "catalog.category_updated",
          targetType: "Category",
          targetId: categoryId,
          before: { name: current.name, isActive: current.isActive },
          after: { name: updated.name, isActive: updated.isActive },
          ...auditContext,
        }),
      });
      return updated;
    });
    return Response.json({ data: category });
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
