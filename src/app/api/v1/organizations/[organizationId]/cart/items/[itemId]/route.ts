import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  cartView,
  removeCartItem,
  updateCartItem,
} from "@/modules/orders/application/order-service";
import { updateCartItemSchema } from "@/modules/orders/application/schemas";

type Context = { params: Promise<{ organizationId: string; itemId: string }> };

async function authorize(request: Request, organizationId: string) {
  const { user } = await requireOrganizationPermission(request, organizationId, "purchase:manage");
  const limit = await consumeRateLimit(`cart-write:${user.id}:${organizationId}`, {
    window: 60,
    max: 60,
  });
  if (!limit.allowed) throw new HttpError(429, "Çok fazla sepet işlemi.", "RATE_LIMITED");
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { organizationId, itemId } = await context.params;
    await authorize(request, organizationId);
    const input = updateCartItemSchema.parse(await parseJsonBody(request));
    return Response.json({
      data: cartView(
        await updateCartItem({ buyerOrganizationId: organizationId, itemId, ...input }),
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Miktar geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { organizationId, itemId } = await context.params;
    await authorize(request, organizationId);
    return Response.json({ data: cartView(await removeCartItem(organizationId, itemId)) });
  } catch (error) {
    return errorResponse(error);
  }
}
