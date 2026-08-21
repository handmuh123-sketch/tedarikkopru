import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { IDEMPOTENCY_KEY_PATTERN, returnDecisionSchema } from "@/modules/returns/application/schemas";
import { decideReturnRequest } from "@/modules/returns/application/return-service";

type Context = {
  params: Promise<{ organizationId: string; orderId: string; returnId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, orderId, returnId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "order:fulfill");
    const limit = await consumeRateLimit(`return-decision:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla iade kararı işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = returnDecisionSchema.parse(await parseJsonBody(request));
    const returnRequest = await decideReturnRequest({
      supplierOrganizationId: organizationId,
      orderId,
      returnRequestId: returnId,
      decision: body.decision,
      idempotencyKey,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: returnRequest });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "İade kararı geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
