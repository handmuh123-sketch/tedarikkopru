import { requirePlatformAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);
    const applications = await database.verificationApplication.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW", "NEEDS_CHANGES"] } },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        version: true,
        organization: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            type: true,
            verificationStatus: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            mimeType: true,
            size: true,
            scanStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    });
    return Response.json({ data: applications });
  } catch (error) {
    return errorResponse(error);
  }
}
