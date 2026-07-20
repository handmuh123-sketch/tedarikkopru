import { requireOrganizationPermission } from "@/lib/auth/access";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { adjustInventory } from "@/modules/inventory/application/inventory-service";
import { inventoryAdjustmentSchema } from "@/modules/inventory/application/schemas";

type Context = { params: Promise<{ organizationId: string; variantId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { organizationId, variantId } = await context.params;
    const { user } = await requireOrganizationPermission(
      request,
      organizationId,
      "inventory:manage",
    );
    const limit = await consumeRateLimit(`inventory-adjust:${user.id}:${organizationId}`, {
      window: 60,
      max: 40,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla stok işlemi.", "RATE_LIMITED");
    const input = inventoryAdjustmentSchema.parse(await parseJsonBody(request));
    const inventory = await adjustInventory({
      organizationId,
      variantId,
      onHand: input.onHand,
      safetyStock: input.safetyStock,
      expectedVersion: input.version,
      reason: input.reason,
      actorUserId: user.id,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: inventory });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(new HttpError(422, "Stok bilgileri geçersiz.", "VALIDATION_ERROR"));
    }
    return errorResponse(error);
  }
}
