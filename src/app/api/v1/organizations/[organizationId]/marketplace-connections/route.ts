import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import {
  createMarketplaceConnection,
  listMarketplaceConnections,
} from "@/modules/marketplace/application/connection-service";
import { marketplaceConnectionCreateSchema } from "@/modules/marketplace/application/schemas";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    await requireOrganizationPermission(request, organizationId, "organization:read");
    return Response.json({ data: await listMarketplaceConnections(organizationId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "marketplace:manage",
    );
    const limit = await consumeRateLimit(`marketplace-connection:${user.id}:${organizationId}`, {
      window: 600,
      max: 12,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla bağlantı işlemi yapıldı.", "RATE_LIMITED");
    const parsed = marketplaceConnectionCreateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success)
      throw new HttpError(
        422,
        "Pazaryeri bağlantı bilgileri geçersiz.",
        "MARKETPLACE_INPUT_INVALID",
      );
    const connection = await createMarketplaceConnection(parsed.data, {
      actorId: user.id,
      organizationId,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: connection }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
