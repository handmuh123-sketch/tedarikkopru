import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  addCartItem,
  cartView,
  getBuyerCart,
  releaseExpiredReservations,
} from "@/modules/orders/application/order-service";
import { addCartItemSchema } from "@/modules/orders/application/schemas";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "purchase:manage");
    await releaseExpiredReservations();
    return Response.json({ data: cartView(await getBuyerCart(organizationId)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "purchase:manage",
    );
    const limit = await consumeRateLimit(`cart-write:${user.id}:${organizationId}`, {
      window: 60,
      max: 60,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla sepet işlemi.", "RATE_LIMITED");
    const input = addCartItemSchema.parse(await parseJsonBody(request));
    const cart = await addCartItem({ buyerOrganizationId: organizationId, ...input });
    return Response.json({ data: cartView(cart) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Sepet bilgileri geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
