import { requireCatalogAdmin } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import {
  listTrendyolMetadata,
  recordTrendyolMetadataSync,
  syncTrendyolMetadata,
} from "@/modules/marketplace/application/metadata-service";
import { trendyolMetadataSyncSchema } from "@/modules/marketplace/application/schemas";

export async function GET(request: Request) {
  try {
    await requireCatalogAdmin(request);
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return Response.json(
      { data: await listTrendyolMetadata(query) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireCatalogAdmin(request);
    const parsed = trendyolMetadataSyncSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw new HttpError(
        422,
        "Trendyol meta veri kaydı geçersiz.",
        "MARKETPLACE_METADATA_INVALID",
      );
    }
    const result = await syncTrendyolMetadata(parsed.data);
    await recordTrendyolMetadataSync(
      { result, source: parsed.data.source },
      {
        actorId: user.id,
        requestId: resolveRequestId(request.headers.get("x-request-id")),
        network: requestNetworkKey(request),
      },
    );
    return Response.json({ data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
