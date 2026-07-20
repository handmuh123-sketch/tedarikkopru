import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { createCheckoutDraft } from "@/modules/orders/application/order-service";
import { checkoutDraftSchema, IDEMPOTENCY_KEY_PATTERN } from "@/modules/orders/application/schemas";

type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "purchase:manage",
    );
    const limit = await consumeRateLimit(`checkout:${user.id}:${organizationId}`, {
      window: 60,
      max: 20,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla checkout işlemi.", "RATE_LIMITED");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new HttpError(
        400,
        "Geçerli bir Idempotency-Key başlığı gerekli.",
        "INVALID_IDEMPOTENCY_KEY",
      );
    }
    const body = checkoutDraftSchema.parse(await parseJsonBody(request));
    const checkout = await createCheckoutDraft({
      buyerOrganizationId: organizationId,
      actorUserId: user.id,
      idempotencyKey,
      ...body,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json(
      {
        data: {
          id: checkout.id,
          status: checkout.status,
          subtotalAmountMinor: checkout.subtotalAmountMinor,
          vatAmountMinor: checkout.vatAmountMinor,
          totalAmountMinor: checkout.totalAmountMinor,
          expiresAt: checkout.expiresAt,
          order: checkout.order
            ? {
                id: checkout.order.id,
                publicNumber: checkout.order.publicNumber,
                status: checkout.order.status,
              }
            : null,
          reservations: checkout.reservations,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Checkout bilgileri geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
