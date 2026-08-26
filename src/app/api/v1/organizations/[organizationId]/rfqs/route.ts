import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { createRfqSchema } from "@/modules/rfq/application/schemas";
import { createRfq } from "@/modules/rfq/application/rfq-service";

type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "purchase:manage",
    );
    const limit = await consumeRateLimit(`rfq-create:${user.id}:${organizationId}`, {
      window: 60,
      max: 30,
    });
    if (!limit.allowed) {
      throw new HttpError(429, "Çok fazla teklif talebi oluşturuldu.", "RATE_LIMITED");
    }
    const body = createRfqSchema.parse(await parseJsonBody(request));
    const rfq = await createRfq({
      buyerOrganizationId: organizationId,
      variantId: body.variantId,
      targetQuantity: body.targetQuantity,
      ...(body.buyerNote ? { buyerNote: body.buyerNote } : {}),
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: rfq }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Teklif talebi geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
