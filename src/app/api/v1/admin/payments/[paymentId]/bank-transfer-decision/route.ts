import { requirePlatformAdmin } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { IDEMPOTENCY_KEY_PATTERN } from "@/modules/orders/application/schemas";
import { decideBankTransfer } from "@/modules/payments/application/bank-transfer-service";
import { bankTransferDecisionSchema } from "@/modules/payments/application/schemas";

type Context = { params: Promise<{ paymentId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { paymentId } = await context.params;
    const { user } = await requirePlatformAdmin(request);
    const limit = await consumeRateLimit(`bank-transfer-decision:${user.id}`, { window: 60, max: 20 });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla ödeme kararı işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key başlığı gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = bankTransferDecisionSchema.parse(await parseJsonBody(request));
    const payment = await decideBankTransfer({
      paymentId,
      decision: body.decision,
      actorUserId: user.id,
      idempotencyKey,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: { id: payment.id, status: payment.status, order: payment.order } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Banka transferi kararı geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
