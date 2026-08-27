import { requireUser } from "@/lib/auth/access";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { buildMarketplaceChannelPreview } from "@/modules/marketplace/application/channel-preview";
import { marketplaceProviderBySlug } from "@/modules/marketplace/domain/providers";

type Context = { params: Promise<{ channel: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await requireUser(request);
    const { channel } = await context.params;
    const provider = marketplaceProviderBySlug(channel);
    if (!provider) {
      throw new HttpError(404, "Pazaryeri kanalı bulunamadı.", "MARKETPLACE_CHANNEL_NOT_FOUND");
    }
    const preview = await buildMarketplaceChannelPreview(user.id, provider.channel);
    return new Response(JSON.stringify(preview, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${provider.slug}-hazirlik.json"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
