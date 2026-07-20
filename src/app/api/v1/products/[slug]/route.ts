import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const product = await database.product.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        description: true,
        originCountry: true,
        vatRateBasisPoints: true,
        warrantyMonths: true,
        handlingDays: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        supplierOrganization: { select: { tradeName: true, slug: true } },
        variants: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: {
            title: true,
            sku: true,
            barcode: true,
            packageQuantity: true,
            priceAmountMinor: true,
            currency: true,
            moq: true,
            quantityStep: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          select: { storageKey: true, altText: true, isPrimary: true },
        },
      },
    });
    if (!product) throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    return Response.json(
      { data: product },
      { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
