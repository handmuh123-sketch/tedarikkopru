import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import {
  createShipmentSchema,
  IDEMPOTENCY_KEY_PATTERN,
} from "@/modules/shipping/application/schemas";
import { createShipment } from "@/modules/shipping/application/shipping-service";

type Context = { params: Promise<{ organizationId: string; orderId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, orderId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "order:fulfill");
    const limit = await consumeRateLimit(`shipment-create:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla kargo oluşturma işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = createShipmentSchema.parse(await parseJsonBody(request));
    const shipment = await createShipment({
      supplierOrganizationId: organizationId,
      orderId,
      carrier: body.carrier,
      trackingNumber: body.trackingNumber,
      shippedAt: body.shippedAt,
      ...(body.estimatedDeliveryAt ? { estimatedDeliveryAt: body.estimatedDeliveryAt } : {}),
      idempotencyKey,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: shipment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Kargo bilgileri geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
