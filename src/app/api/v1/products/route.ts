import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";

export async function GET() {
  try {
    const products = await database.product.findMany({
      where: {
        status: "ACTIVE",
        supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        supplierOrganization: { select: { tradeName: true, slug: true } },
        variants: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            title: true,
            priceAmountMinor: true,
            currency: true,
            moq: true,
            quantityStep: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
          select: { storageKey: true, altText: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 48,
    });
    return Response.json(
      { data: products },
      { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
