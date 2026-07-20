import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { IDEMPOTENCY_KEY_PATTERN } from "@/modules/orders/application/schemas";
import { initiateMockPayment } from "@/modules/payments/application/mock-payment-service";

type Context = { params: Promise<{ organizationId: string; orderId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, orderId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "purchase:manage",
    );
    const limit = await consumeRateLimit(`mock-payment-start:${user.id}:${organizationId}`, {
      window: 60,
      max: 20,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla ödeme işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(
        400,
        "Geçerli bir Idempotency-Key başlığı gerekli.",
        "INVALID_IDEMPOTENCY_KEY",
      );
    }
    const payment = await initiateMockPayment({
      buyerOrganizationId: organizationId,
      orderId,
      actorUserId: user.id,
      idempotencyKey,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json(
      {
        data: {
          id: payment.id,
          provider: payment.provider,
          status: payment.status,
          currency: payment.currency,
          amountMinor: payment.amountMinor,
          order: payment.order,
          attempts: payment.attempts.map((attempt) => ({
            outcome: attempt.outcome,
            createdAt: attempt.createdAt,
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
