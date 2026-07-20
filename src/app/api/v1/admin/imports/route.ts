import { requireCatalogAdmin } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    await requireCatalogAdmin(request);
    const jobs = await database.importJob.findMany({
      select: {
        id: true,
        status: true,
        fileType: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        createdAt: true,
        completedAt: true,
        organization: { select: { tradeName: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ data: jobs });
  } catch (error) {
    return errorResponse(error);
  }
}
