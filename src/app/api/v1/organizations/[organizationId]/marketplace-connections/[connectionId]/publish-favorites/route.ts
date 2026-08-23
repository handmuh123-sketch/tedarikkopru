import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { publishFavoriteProducts } from "@/modules/marketplace/application/publish-service";

type Context = { params: Promise<{ organizationId: string; connectionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, connectionId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "marketplace:manage",
    );
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128)
      throw new HttpError(400, "Geçerli bir Idempotency-Key gerekli.", "IDEMPOTENCY_KEY_REQUIRED");
    const limit = await consumeRateLimit(`marketplace-publish:${user.id}:${organizationId}`, {
      window: 600,
      max: 8,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla yayın isteği yapıldı.", "RATE_LIMITED");
    const result = await publishFavoriteProducts(connectionId, idempotencyKey, {
      actorId: user.id,
      organizationId,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
