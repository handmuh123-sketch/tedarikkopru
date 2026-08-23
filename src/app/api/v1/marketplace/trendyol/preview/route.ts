import { requireUser } from "@/lib/auth/access";
import { errorResponse } from "@/lib/http/errors";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    return Response.json(
      { data: await buildTrendyolPreview(user.id) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
