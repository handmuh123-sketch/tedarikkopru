import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { IDEMPOTENCY_KEY_PATTERN } from "@/modules/orders/application/schemas";
import { initiateBankTransfer } from "@/modules/payments/application/bank-transfer-service";
import { bankTransferStartSchema } from "@/modules/payments/application/schemas";

type Context = { params: Promise<{ organizationId: string; orderId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, orderId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "purchase:manage");
    const limit = await consumeRateLimit(`bank-transfer-start:${user.id}:${organizationId}`, {
      window: 60,
      max: 10,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla ödeme işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key başlığı gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = bankTransferStartSchema.parse(await parseJsonBody(request));
    const payment = await initiateBankTransfer({
      buyerOrganizationId: organizationId,
      orderId,
      actorUserId: user.id,
      idempotencyKey,
      ...(body.note ? { note: body.note } : {}),
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
          bankTransferReference: payment.bankTransferReference,
          order: payment.order,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Banka transferi bildirimi geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
