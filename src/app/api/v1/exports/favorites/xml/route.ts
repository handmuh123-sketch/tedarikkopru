import { requireUser } from "@/lib/auth/access";
import { errorResponse } from "@/lib/http/errors";
import { buildFavoriteProductsXml } from "@/modules/marketplace/application/favorites-xml";
import { loadFavoriteMarketplaceProducts } from "@/modules/marketplace/application/favorite-product-loader";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const products = await loadFavoriteMarketplaceProducts(user.id);
    return new Response(buildFavoriteProductsXml(products), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "content-disposition": 'attachment; filename="tedarikkopru-favoriler.xml"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
