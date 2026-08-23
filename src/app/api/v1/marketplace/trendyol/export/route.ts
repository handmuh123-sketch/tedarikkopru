import { requireUser } from "@/lib/auth/access";
import { errorResponse } from "@/lib/http/errors";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const preview = await buildTrendyolPreview(user.id);
    return new Response(JSON.stringify(preview, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="trendyol-onizleme.json"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
