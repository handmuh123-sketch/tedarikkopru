import { errorResponse } from "@/lib/http/errors";
import {
  findPublicProducts,
  parseTryFilterMinor,
} from "@/modules/catalog/application/public-catalog";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

export async function GET(request = new Request("http://localhost/api/v1/products")) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim().slice(0, 80) || undefined;
    const products = await findPublicProducts({
      query,
      category: url.searchParams.get("category")?.trim() || undefined,
      brand: url.searchParams.get("brand")?.trim() || undefined,
      minPriceMinor: parseTryFilterMinor(url.searchParams.get("minPrice") ?? undefined),
      maxPriceMinor: parseTryFilterMinor(url.searchParams.get("maxPrice") ?? undefined),
    });
    const data = products.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      shortDescription: product.shortDescription,
      publishedAt: product.publishedAt,
      category: { name: product.category.name, slug: product.category.slug },
      brand: { name: product.brand.name, slug: product.brand.slug },
      supplierOrganization: {
        tradeName: product.supplierOrganization.tradeName,
        slug: product.supplierOrganization.slug,
      },
      variants: product.variants.map((variant) => ({
        title: variant.title,
        priceAmountMinor: variant.priceAmountMinor,
        currency: variant.currency,
        moq: variant.moq,
        quantityStep: variant.quantityStep,
        availableStock: availableStock(variant.inventory!.onHand, variant.inventory!.safetyStock),
      })),
      images: product.images.map((image) => ({
        storageKey: image.storageKey,
        altText: image.altText,
      })),
    }));
    return Response.json(
      { data },
      { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
