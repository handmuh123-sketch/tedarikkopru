import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import {
  addAcceptedQuoteToCart,
  cartView,
} from "@/modules/orders/application/order-service";

type Context = {
  params: Promise<{ organizationId: string; rfqId: string; quoteId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, rfqId, quoteId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "purchase:manage",
    );
    const limit = await consumeRateLimit(`rfq-cart:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla teklif-sepet işlemi.", "RATE_LIMITED");
    const cart = await addAcceptedQuoteToCart({
      buyerOrganizationId: organizationId,
      rfqId,
      quoteId,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: cartView(cart) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
