import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { productModerationSchema } from "@/modules/catalog/application/schemas";
import { canTransitionProduct } from "@/modules/catalog/domain/product-rules";

type Context = { params: Promise<{ productId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const { productId } = await context.params;
    const limit = await consumeRateLimit(`product-moderate:${user.id}`, { window: 600, max: 100 });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla moderasyon işlemi.", "RATE_LIMITED");
    const input = productModerationSchema.parse(await parseJsonBody(request));
    const product = await database.product.findUnique({
      where: { id: productId },
      include: { supplierOrganization: true },
    });
    if (!product) throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    if (!canTransitionProduct(product.status, input.status))
      throw new HttpError(409, "Geçersiz ürün durumu geçişi.", "INVALID_PRODUCT_TRANSITION");
    if (
      input.status === "ACTIVE" &&
      (product.supplierOrganization.status !== "ACTIVE" ||
        product.supplierOrganization.verificationStatus !== "APPROVED")
    )
      throw new HttpError(
        409,
        "Doğrulanmamış tedarikçi ürünü onaylanamaz.",
        "SUPPLIER_NOT_VERIFIED",
      );
    const now = new Date();
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    await database.$transaction(async (transaction) => {
      const claimed = await transaction.product.updateMany({
        where: { id: productId, status: product.status },
        data: {
          status: input.status,
          moderationNote: input.note ?? null,
          publishedAt: input.status === "ACTIVE" ? now : null,
        },
      });
      if (claimed.count !== 1)
        throw new HttpError(409, "Ürün durumu değişti; tekrar deneyin.", "PRODUCT_STATE_CONFLICT");
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId: product.supplierOrganizationId,
          action: "catalog.product_moderated",
          targetType: "Product",
          targetId: productId,
          before: { status: product.status },
          after: { status: input.status, noteProvided: Boolean(input.note) },
          ...auditContext,
        }),
      });
    });
    return Response.json({ data: { id: productId, status: input.status } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(
        new HttpError(422, "Moderasyon bilgileri geçersiz.", "VALIDATION_ERROR"),
      );
    return errorResponse(error);
  }
}
