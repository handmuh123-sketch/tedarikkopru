import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import {
  disconnectMarketplaceConnection,
  updateMarketplaceConnection,
} from "@/modules/marketplace/application/connection-service";
import { marketplaceConnectionUpdateSchema } from "@/modules/marketplace/application/schemas";

type Context = { params: Promise<{ organizationId: string; connectionId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { organizationId, connectionId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "marketplace:manage",
    );
    const parsed = marketplaceConnectionUpdateSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success)
      throw new HttpError(
        422,
        "Pazaryeri bağlantı bilgileri geçersiz.",
        "MARKETPLACE_INPUT_INVALID",
      );
    const connection = await updateMarketplaceConnection(connectionId, parsed.data, {
      actorId: user.id,
      organizationId,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: connection });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { organizationId, connectionId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "marketplace:manage",
    );
    const connection = await disconnectMarketplaceConnection(connectionId, {
      actorId: user.id,
      organizationId,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: connection });
  } catch (error) {
    return errorResponse(error);
  }
}
