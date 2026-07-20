import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    await requireCatalogAdmin(request);
    const products = await database.product.findMany({
      where: { status: { in: ["PENDING_REVIEW", "REJECTED"] } },
      include: {
        supplierOrganization: { select: { tradeName: true, verificationStatus: true } },
        category: true,
        brand: true,
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { updatedAt: "asc" },
    });
    return Response.json({ data: products });
  } catch (error) {
    return errorResponse(error);
  }
}
