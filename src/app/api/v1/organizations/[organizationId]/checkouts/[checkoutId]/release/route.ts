import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { releaseCheckout } from "@/modules/orders/application/order-service";

type Context = { params: Promise<{ organizationId: string; checkoutId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, checkoutId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "purchase:manage",
    );
    const limit = await consumeRateLimit(`checkout-release:${user.id}:${organizationId}`, {
      window: 60,
      max: 20,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla rezervasyon işlemi.", "RATE_LIMITED");
    const checkout = await releaseCheckout({
      buyerOrganizationId: organizationId,
      checkoutId,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: { id: checkout.id, status: checkout.status } });
  } catch (error) {
    return errorResponse(error);
  }
}
