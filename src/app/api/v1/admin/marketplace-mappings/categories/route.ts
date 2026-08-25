import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { marketplaceMappingSchema } from "@/modules/marketplace/application/schemas";

export async function GET(request: Request) {
  try {
    await requireCatalogAdmin(request);
    const data = await database.marketplaceCategoryMapping.findMany({
      include: { category: { select: { id: true, name: true, path: true } } },
      orderBy: [{ channel: "asc" }, { createdAt: "desc" }],
    });
    return Response.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const parsed = marketplaceMappingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success)
      throw new HttpError(422, "Kategori eşleşmesi geçersiz.", "MARKETPLACE_MAPPING_INVALID");
    const category = await database.category.findUnique({ where: { id: parsed.data.sourceId } });
    if (!category) throw new HttpError(404, "Kategori bulunamadı.", "CATEGORY_NOT_FOUND");
    const externalMetadata = await database.marketplaceExternalCategory.findUnique({
      where: {
        channel_externalId: { channel: parsed.data.channel, externalId: parsed.data.externalId },
      },
      select: { source: true },
    });
    const mapping = await database.$transaction(async (transaction) => {
      const updated = await transaction.marketplaceCategoryMapping.upsert({
        where: {
          channel_categoryId: { channel: parsed.data.channel, categoryId: category.id },
        },
        update: {
          externalCategoryId: parsed.data.externalId,
          externalCategoryName: parsed.data.externalName,
          metadataSource: externalMetadata?.source ?? "MANUAL",
          isActive: parsed.data.isActive ?? true,
        },
        create: {
          channel: parsed.data.channel,
          categoryId: category.id,
          externalCategoryId: parsed.data.externalId,
          externalCategoryName: parsed.data.externalName,
          metadataSource: externalMetadata?.source ?? "MANUAL",
          isActive: parsed.data.isActive ?? true,
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "marketplace.category_mapping_updated",
          targetType: "MarketplaceCategoryMapping",
          targetId: updated.id,
          after: {
            channel: updated.channel,
            categoryId: updated.categoryId,
            active: updated.isActive,
            metadataSource: updated.metadataSource,
          },
          requestId: resolveRequestId(request.headers.get("x-request-id")),
          network: requestNetworkKey(request),
        }),
      });
      return updated;
    });
    return Response.json({ data: mapping });
  } catch (error) {
    return errorResponse(error);
  }
}
