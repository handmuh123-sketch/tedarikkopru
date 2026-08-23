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
    const data = await database.marketplaceBrandMapping.findMany({
      include: { brand: { select: { id: true, name: true } } },
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
      throw new HttpError(422, "Marka eşleşmesi geçersiz.", "MARKETPLACE_MAPPING_INVALID");
    const brand = await database.brand.findUnique({ where: { id: parsed.data.sourceId } });
    if (!brand) throw new HttpError(404, "Marka bulunamadı.", "BRAND_NOT_FOUND");
    const mapping = await database.$transaction(async (transaction) => {
      const updated = await transaction.marketplaceBrandMapping.upsert({
        where: { channel_brandId: { channel: parsed.data.channel, brandId: brand.id } },
        update: {
          externalBrandId: parsed.data.externalId,
          externalBrandName: parsed.data.externalName,
          isActive: parsed.data.isActive ?? true,
        },
        create: {
          channel: parsed.data.channel,
          brandId: brand.id,
          externalBrandId: parsed.data.externalId,
          externalBrandName: parsed.data.externalName,
          isActive: parsed.data.isActive ?? true,
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          action: "marketplace.brand_mapping_updated",
          targetType: "MarketplaceBrandMapping",
          targetId: updated.id,
          after: { channel: updated.channel, brandId: updated.brandId, active: updated.isActive },
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
