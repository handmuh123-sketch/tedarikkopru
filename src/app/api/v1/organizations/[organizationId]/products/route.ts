import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import { productWriteSchema } from "@/modules/catalog/application/schemas";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const products = await database.product.findMany({
      where: { supplierOrganizationId: organizationId },
      include: {
        category: true,
        brand: true,
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json({ data: products });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const limit = await consumeRateLimit(`product-create:${user.id}:${organizationId}`, {
      window: 3600,
      max: 30,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla ürün oluşturma denemesi.", "RATE_LIMITED");
    const input = productWriteSchema.parse(await parseJsonBody(request));
    const organization = await database.organization.findFirst({
      where: {
        id: organizationId,
        type: { in: ["SUPPLIER", "BOTH"] },
        status: { not: "ARCHIVED" },
      },
      select: { id: true },
    });
    if (!organization) throw new HttpError(409, "Bu işletme ürün yayınlayamaz.", "NOT_A_SUPPLIER");
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
    const auditContext = {
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    };
    const product = await database.$transaction(async (transaction) => {
      const created = await transaction.product.create({
        data: {
          supplierOrganizationId: organizationId,
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
          attributes: {},
          variants: {
            create: {
              ...input.variant,
              barcode: input.variant.barcode ?? null,
              currency: "TRY",
              optionValues: {},
            },
          },
        },
        include: { category: true, brand: true, variants: true },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "catalog.product_created",
          targetType: "Product",
          targetId: created.id,
          after: {
            title: created.title,
            status: created.status,
            sku: created.variants[0]?.sku,
            priceAmountMinor: created.variants[0]?.priceAmountMinor,
          },
          ...auditContext,
        }),
      });
      return created;
    });
    return Response.json({ data: product }, { status: 201 });
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
