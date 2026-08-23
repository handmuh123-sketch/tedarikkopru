import { requirePlatformOperator } from "@/lib/auth/access";
import { errorResponse } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { replayMarketplaceWebhook } from "@/modules/marketplace/application/webhook-service";

type Context = { params: Promise<{ webhookId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { webhookId } = await context.params;
    const { user } = await requirePlatformOperator(request);
    const data = await replayMarketplaceWebhook({
      webhookId,
      actorId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({
      data: { id: data.id, status: data.status, retryCount: data.retryCount },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
