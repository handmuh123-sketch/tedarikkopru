import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { canTransitionProduct } from "@/modules/catalog/domain/product-rules";

type Context = { params: Promise<{ organizationId: string; productId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, productId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const limit = await consumeRateLimit(`product-submit:${user.id}:${organizationId}`, {
      window: 3600,
      max: 40,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla moderasyon gönderimi.", "RATE_LIMITED");
    const product = await database.product.findFirst({
      where: { id: productId, supplierOrganizationId: organizationId },
      include: { variants: true, category: true, brand: true, supplierOrganization: true },
    });
    if (!product) throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    if (!canTransitionProduct(product.status, "PENDING_REVIEW"))
      throw new HttpError(409, "Ürün moderasyona gönderilemez.", "INVALID_PRODUCT_TRANSITION");
    if (
      product.supplierOrganization.status !== "ACTIVE" ||
      product.supplierOrganization.verificationStatus !== "APPROVED" ||
      !["SUPPLIER", "BOTH"].includes(product.supplierOrganization.type)
    )
      throw new HttpError(
        409,
        "Yalnız doğrulanmış tedarikçi ürün yayınlayabilir.",
        "SUPPLIER_NOT_VERIFIED",
      );
    if (
      !product.category.isActive ||
      product.brand.status !== "ACTIVE" ||
      product.variants.length === 0
    )
      throw new HttpError(
        422,
        "Aktif kategori, marka ve varyant gereklidir.",
        "PRODUCT_INCOMPLETE",
      );
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    await database.$transaction(async (transaction) => {
      const claimed = await transaction.product.updateMany({
        where: { id: productId, supplierOrganizationId: organizationId, status: product.status },
        data: { status: "PENDING_REVIEW", moderationNote: null },
      });
      if (claimed.count !== 1)
        throw new HttpError(409, "Ürün durumu değişti; tekrar deneyin.", "PRODUCT_STATE_CONFLICT");
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "catalog.product_submitted",
          targetType: "Product",
          targetId: productId,
          before: { status: product.status },
          after: { status: "PENDING_REVIEW" },
          ...auditContext,
        }),
      });
    });
    return Response.json({ data: { id: productId, status: "PENDING_REVIEW" } });
  } catch (error) {
    return errorResponse(error);
  }
}
