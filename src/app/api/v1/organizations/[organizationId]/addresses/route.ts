import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { requestNetworkKey } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/modules/audit/audit-service";
import { addressSchema } from "@/modules/organizations/application/schemas";

type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "address:manage");
    const input = addressSchema.parse(await parseJsonBody(request));
    const address = await database.$transaction(async (transaction) => {
      if (input.isDefault) {
        await transaction.address.updateMany({
          where: { organizationId, type: input.type },
          data: { isDefault: false },
        });
      }
      return transaction.address.create({
        data: {
          organizationId,
          type: input.type,
          title: input.title,
          contactName: input.contactName,
          phone: input.phone,
          countryCode: input.countryCode,
          city: input.city,
          district: input.district,
          neighborhood: input.neighborhood ?? null,
          postalCode: input.postalCode ?? null,
          line1: input.line1,
          line2: input.line2 ?? null,
          isDefault: input.isDefault,
        },
      });
    });
    await writeAuditLog({
      actorId: user.id,
      organizationId,
      action: "address.created",
      targetType: "Address",
      targetId: address.id,
      after: address,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: address }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "Adres bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
