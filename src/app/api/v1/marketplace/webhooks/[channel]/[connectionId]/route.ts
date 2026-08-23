import { errorResponse, HttpError } from "@/lib/http/errors";
import { receiveMarketplaceWebhook } from "@/modules/marketplace/application/webhook-service";
import { marketplaceChannelSchema } from "@/modules/marketplace/application/schemas";

type Context = { params: Promise<{ channel: string; connectionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { channel, connectionId } = await context.params;
    const parsedChannel = marketplaceChannelSchema.safeParse(channel);
    if (!parsedChannel.success)
      throw new HttpError(404, "Pazaryeri webhook kanalı bulunamadı.", "WEBHOOK_CHANNEL_NOT_FOUND");
    const body = await request.text();
    if (Buffer.byteLength(body) > 1_048_576)
      throw new HttpError(413, "Webhook gövdesi çok büyük.", "WEBHOOK_BODY_TOO_LARGE");
    const result = await receiveMarketplaceWebhook({
      channel: parsedChannel.data,
      connectionId,
      body,
      providedApiKey: request.headers.get("x-api-key"),
      externalEventId: request.headers.get("x-trendyol-event-id"),
    });
    return Response.json({ data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
