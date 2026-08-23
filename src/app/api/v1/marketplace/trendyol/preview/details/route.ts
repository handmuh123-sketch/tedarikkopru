import { requireUser } from "@/lib/auth/access";
import { errorResponse } from "@/lib/http/errors";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const preview = await buildTrendyolPreview(user.id);
    return Response.json(
      {
        data: {
          generatedAt: preview.generatedAt,
          validation: preview.validation,
          products: preview.products.map((product) => ({
            productId: product.productId,
            variantId: product.variantId,
            valid: product.validation.valid,
            errors: product.validation.errors,
            warnings: product.validation.warnings,
            mappingSources: product.mappingSources,
          })),
        },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
