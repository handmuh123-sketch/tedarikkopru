import { requireUser } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { findPublicProductBySlug } from "@/modules/catalog/application/public-catalog";

type Context = { params: Promise<{ productId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await requireUser(request);
    const { productId } = await context.params;
    const product = await database.product.findFirst({
      where: { id: productId },
      select: { id: true, slug: true },
    });
    if (!product || !(await findPublicProductBySlug(product.slug))) {
      throw new HttpError(404, "Ürün bulunamadı.", "PRODUCT_NOT_FOUND");
    }
    await database.productFavorite.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {},
      create: { userId: user.id, productId },
    });
    return Response.json({ data: { productId, favorite: true } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user } = await requireUser(request);
    const { productId } = await context.params;
    await database.productFavorite.deleteMany({ where: { userId: user.id, productId } });
    return Response.json({ data: { productId, favorite: false } });
  } catch (error) {
    return errorResponse(error);
  }
}
