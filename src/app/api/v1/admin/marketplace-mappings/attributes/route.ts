import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { marketplaceAttributeMappingSchema } from "@/modules/marketplace/application/schemas";

export async function POST(request: Request) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const parsed = marketplaceAttributeMappingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success)
      throw new HttpError(422, "Özellik eşleşmesi geçersiz.", "MARKETPLACE_MAPPING_INVALID");
    const categoryMapping = await database.marketplaceCategoryMapping.findUnique({
      where: { id: parsed.data.categoryMappingId },
    });
    if (!categoryMapping)
      throw new HttpError(
        404,
        "Kategori eşleşmesi bulunamadı.",
        "MARKETPLACE_CATEGORY_MAPPING_NOT_FOUND",
      );
    const externalMetadata = await database.marketplaceExternalAttribute.findUnique({
      where: {
        channel_externalCategoryId_externalAttributeId: {
          channel: categoryMapping.channel,
          externalCategoryId: categoryMapping.externalCategoryId,
          externalAttributeId: parsed.data.externalAttributeId,
        },
      },
      include: { values: { where: { isActive: true }, select: { externalId: true } } },
    });
    if (
      parsed.data.externalValueId &&
      !externalMetadata?.values.some((value) => value.externalId === parsed.data.externalValueId)
    ) {
      throw new HttpError(
        422,
        "Seçilen Trendyol özellik değeri ilgili provider özelliğine ait değil.",
        "MARKETPLACE_ATTRIBUTE_VALUE_INVALID",
      );
    }
    const mapping = await database.$transaction(async (transaction) => {
      const updated = await transaction.marketplaceAttributeMapping.upsert({
        where: {
          categoryMappingId_sourceAttributeKey: {
            categoryMappingId: categoryMapping.id,
            sourceAttributeKey: parsed.data.sourceAttributeKey,
          },
        },
        update: {
          externalAttributeId: parsed.data.externalAttributeId,
          externalAttributeName: parsed.data.externalAttributeName,
          externalValueId: parsed.data.externalValueId ?? null,
          metadataSource: externalMetadata?.source ?? "MANUAL",
          isActive: parsed.data.isActive ?? true,
        },
        create: {
          categoryMappingId: categoryMapping.id,
          sourceAttributeKey: parsed.data.sourceAttributeKey,
          externalAttributeId: parsed.data.externalAttributeId,
          externalAttributeName: parsed.data.externalAttributeName,
          externalValueId: parsed.data.externalValueId ?? null,
          metadataSource: externalMetadata?.source ?? "MANUAL",
          isActive: parsed.data.isActive ?? true,
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "marketplace.attribute_mapping_updated",
          targetType: "MarketplaceAttributeMapping",
          targetId: updated.id,
          after: {
            channel: categoryMapping.channel,
            categoryMappingId: categoryMapping.id,
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
