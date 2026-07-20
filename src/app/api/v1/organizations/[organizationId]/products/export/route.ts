import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";
import { buildCatalogCsv } from "@/modules/catalog/application/catalog-file";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const variants = await database.productVariant.findMany({
      where: { supplierOrganizationId: organizationId },
      include: { product: { include: { brand: true, category: true } }, inventory: true },
      orderBy: { sku: "asc" },
    });
    const csv = buildCatalogCsv(
      variants.map((variant) => ({
        supplier_sku: variant.sku,
        barcode: variant.barcode ?? "",
        title: variant.product.title,
        brand: variant.product.brand.name,
        category_path: variant.product.category.path,
        variant_name: variant.title,
        description: variant.product.description,
        vat_rate: variant.product.vatRateBasisPoints / 100,
        unit_price: (variant.priceAmountMinor / 100).toFixed(2),
        moq: variant.moq,
        quantity_step: variant.quantityStep,
        stock: variant.inventory?.onHand ?? 0,
        safety_stock: variant.inventory?.safetyStock ?? 0,
        handling_days: variant.product.handlingDays,
      })),
    );
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="tedarikkopru-urunler.csv"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
