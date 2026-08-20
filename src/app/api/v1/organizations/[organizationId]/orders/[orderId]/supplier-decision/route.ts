import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { decideSupplierOrder } from "@/modules/orders/application/supplier-order-service";
import { supplierOrderDecisionSchema } from "@/modules/orders/application/schemas";

type Context = { params: Promise<{ organizationId: string; orderId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, orderId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "order:fulfill");
    const limit = await consumeRateLimit(`supplier-order-decision:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla sipariş kararı işlemi.", "RATE_LIMITED");
    const body = supplierOrderDecisionSchema.parse(await parseJsonBody(request));
    const order = await decideSupplierOrder({
      supplierOrganizationId: organizationId,
      orderId,
      decision: body.decision,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: order });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Sipariş kararı geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
