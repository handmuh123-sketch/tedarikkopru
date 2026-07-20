import { requireUser } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError, parseJsonBody } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { encryptSensitive, keyedHash } from "@/lib/security/crypto";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/modules/audit/audit-service";
import { organizationCreateSchema } from "@/modules/organizations/application/schemas";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const limit = await consumeRateLimit(`organization-create:${user.id}`, {
      window: 3600,
      max: 5,
    });
    if (!limit.allowed)
      throw new HttpError(429, "Çok fazla işletme oluşturma denemesi.", "RATE_LIMITED");
    const input = organizationCreateSchema.parse(await parseJsonBody(request));
    const existingOwner = await database.organizationMembership.count({
      where: { userId: user.id, role: "OWNER", status: "ACTIVE" },
    });
    if (existingOwner >= 5)
      throw new HttpError(409, "İşletme sahipliği sınırına ulaşıldı.", "LIMIT_REACHED");

    const { taxNumber } = input;
    const organization = await database.$transaction(async (transaction) => {
      const created = await transaction.organization.create({
        data: {
          type: input.type,
          legalName: input.legalName,
          tradeName: input.tradeName,
          slug: input.slug,
          taxNumberEncrypted: encryptSensitive(taxNumber),
          taxNumberHash: keyedHash(`tax:${taxNumber}`),
          taxOffice: input.taxOffice,
          mersisNumber: input.mersisNumber ?? null,
          kepAddress: input.kepAddress ?? null,
          website: input.website ?? null,
          phone: input.phone,
          email: input.email,
          sector: input.sector ?? null,
          authorizedPerson: input.authorizedPerson,
          verificationApplications: { create: { riskFlags: [] } },
          memberships: {
            create: { userId: user.id, role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
          },
        },
        select: {
          id: true,
          type: true,
          legalName: true,
          tradeName: true,
          slug: true,
          status: true,
          verificationStatus: true,
        },
      });
      return created;
    });
    await writeAuditLog({
      actorId: user.id,
      organizationId: organization.id,
      action: "organization.created",
      targetType: "Organization",
      targetId: organization.id,
      after: organization,
      requestId: resolveRequestId(request.headers.get("x-request-id")),
      network: requestNetworkKey(request),
    });
    return Response.json({ data: organization }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError")
      return errorResponse(new HttpError(422, "İşletme bilgileri geçersiz.", "VALIDATION_ERROR"));
    return errorResponse(error);
  }
}
