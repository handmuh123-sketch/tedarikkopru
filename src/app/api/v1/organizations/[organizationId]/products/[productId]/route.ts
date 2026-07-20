import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { productWriteSchema } from "@/modules/catalog/application/schemas";

type Context = { params: Promise<{ organizationId: string; productId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId, productId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const product = await database.product.findFirst({
      where: { id: productId, supplierOrganizationId: organizationId },
      include: {
        category: true,
        brand: true,
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    return Response.json({ data: product });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { organizationId, productId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const input = productWriteSchema.parse(await parseJsonBody(request));
    const current = await database.product.findFirst({
      where: { id: productId, supplierOrganizationId: organizationId },
      include: { variants: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (!current) throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    if (current.status === "ARCHIVED")
      throw new HttpError(409, "Arşivlenmiş ürün düzenlenemez.", "PRODUCT_ARCHIVED");
    const [category, brand] = await Promise.all([
      database.category.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      }),
      database.brand.findFirst({
        where: { id: input.brandId, status: "ACTIVE" },
        select: { id: true },
      }),
    ]);
    if (!category || !brand)
      throw new HttpError(422, "Aktif kategori ve marka gereklidir.", "CATALOG_REFERENCE_INVALID");
    const variant = current.variants[0];
    if (!variant) throw new HttpError(409, "Ürünün temel varyantı bulunamadı.", "VARIANT_MISSING");
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const product = await database.$transaction(async (transaction) => {
      const claimed = await transaction.product.updateMany({
        where: { id: productId, supplierOrganizationId: organizationId, status: current.status },
        data: {
          categoryId: input.categoryId,
          brandId: input.brandId,
          title: input.title,
          slug: input.slug,
          shortDescription: input.shortDescription,
          description: input.description,
          originCountry: input.originCountry,
          vatRateBasisPoints: input.vatRateBasisPoints,
          warrantyMonths: input.warrantyMonths ?? null,
          handlingDays: input.handlingDays,
          status: "DRAFT",
          moderationNote: null,
          publishedAt: null,
        },
      });
      if (claimed.count !== 1)
        throw new HttpError(409, "Ürün durumu değişti; tekrar deneyin.", "PRODUCT_STATE_CONFLICT");
      await transaction.productVariant.update({
        where: { id: variant.id },
        data: { ...input.variant, barcode: input.variant.barcode ?? null, currency: "TRY" },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "catalog.product_updated",
          targetType: "Product",
          targetId: productId,
          before: {
            title: current.title,
            status: current.status,
            sku: variant.sku,
            priceAmountMinor: variant.priceAmountMinor,
          },
          after: {
            title: input.title,
            status: "DRAFT",
            sku: input.variant.sku,
            priceAmountMinor: input.variant.priceAmountMinor,
          },
          ...auditContext,
        }),
      });
      return transaction.product.findUniqueOrThrow({
        where: { id: productId },
        include: { category: true, brand: true, variants: true },
      });
    });
    return Response.json({ data: product });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        new HttpError(409, "Ürün kısa adı veya SKU zaten kullanılıyor.", "PRODUCT_CONFLICT"),
      );
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Ürün bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
