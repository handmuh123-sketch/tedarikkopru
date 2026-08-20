import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { IDEMPOTENCY_KEY_PATTERN, offerQuoteSchema } from "@/modules/rfq/application/schemas";
import { offerQuote } from "@/modules/rfq/application/rfq-service";

type Context = { params: Promise<{ organizationId: string; rfqId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, rfqId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "catalog:manage");
    const limit = await consumeRateLimit(`rfq-quote:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla teklif işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = offerQuoteSchema.parse(await parseJsonBody(request));
    const quote = await offerQuote({
      supplierOrganizationId: organizationId,
      rfqId,
      unitPriceAmountMinor: body.unitPriceAmountMinor,
      validUntil: body.validUntil,
      ...(body.supplierNote ? { supplierNote: body.supplierNote } : {}),
      idempotencyKey,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: quote }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Teklif geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
