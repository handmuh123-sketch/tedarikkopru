import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { testMarketplaceConnection } from "@/modules/marketplace/application/connection-service";

type Context = { params: Promise<{ organizationId: string; connectionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, connectionId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "marketplace:manage",
    );
    const result = await testMarketplaceConnection(connectionId, {
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
