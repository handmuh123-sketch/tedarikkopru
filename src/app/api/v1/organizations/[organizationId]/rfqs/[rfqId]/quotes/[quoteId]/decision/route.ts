import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { IDEMPOTENCY_KEY_PATTERN, quoteDecisionSchema } from "@/modules/rfq/application/schemas";
import { decideQuote } from "@/modules/rfq/application/rfq-service";

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
    const limit = await consumeRateLimit(`rfq-quote-decision:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla teklif kararı işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = quoteDecisionSchema.parse(await parseJsonBody(request));
    const quote = await decideQuote({
      buyerOrganizationId: organizationId,
      rfqId,
      quoteId,
      decision: body.decision,
      idempotencyKey,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: quote });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Teklif kararı geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
