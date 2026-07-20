import { errorResponse, HttpError } from "@/lib/http/errors";
import { findPublicProductBySlug } from "@/modules/catalog/application/public-catalog";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const product = await findPublicProductBySlug(slug);
    if (!product) throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    const data = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      originCountry: product.originCountry,
      vatRateBasisPoints: product.vatRateBasisPoints,
      warrantyMonths: product.warrantyMonths,
      handlingDays: product.handlingDays,
      publishedAt: product.publishedAt,
      category: { name: product.category.name, slug: product.category.slug },
      brand: { name: product.brand.name, slug: product.brand.slug },
      supplierOrganization: {
        tradeName: product.supplierOrganization.tradeName,
        slug: product.supplierOrganization.slug,
      },
      variants: product.variants.map((variant) => ({
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        packageQuantity: variant.packageQuantity,
        priceAmountMinor: variant.priceAmountMinor,
        currency: variant.currency,
        moq: variant.moq,
        quantityStep: variant.quantityStep,
        availableStock: availableStock(
          variant.inventory!.onHand,
          variant.inventory!.safetyStock,
          variant.inventory!.reserved,
        ),
      })),
      images: product.images.map((image) => ({
        storageKey: image.storageKey,
        altText: image.altText,
        isPrimary: image.isPrimary,
      })),
    };
    return Response.json(
      { data },
      { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
