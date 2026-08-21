import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { createReturnSchema, IDEMPOTENCY_KEY_PATTERN } from "@/modules/returns/application/schemas";
import { createReturnRequest } from "@/modules/returns/application/return-service";

type Context = { params: Promise<{ organizationId: string; orderId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, orderId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "purchase:manage");
    const limit = await consumeRateLimit(`return-create:${user.id}:${organizationId}`, {
      window: 60,
      max: 20,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla iade talebi oluşturuldu.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(400, "Geçerli bir Idempotency-Key gerekli.", "INVALID_IDEMPOTENCY_KEY");
    }
    const body = createReturnSchema.parse(await parseJsonBody(request));
    const returnRequest = await createReturnRequest({
      buyerOrganizationId: organizationId,
      orderId,
      reason: body.reason,
      ...(body.buyerNote ? { buyerNote: body.buyerNote } : {}),
      items: body.items,
      idempotencyKey,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: returnRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "İade talebi geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
