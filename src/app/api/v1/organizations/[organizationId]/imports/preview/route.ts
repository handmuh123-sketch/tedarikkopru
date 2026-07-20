import { createHash } from "node:crypto";
import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { parseCatalogFile } from "@/modules/catalog/application/catalog-file";
import { validateCatalogRows } from "@/modules/catalog/application/import-preview";

type Context = { params: Promise<{ organizationId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "catalog:import");
    const limit = await consumeRateLimit(`catalog-import:${user.id}:${organizationId}`, {
      window: 600,
      max: 12,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla import denemesi.", "RATE_LIMITED");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new HttpError(422, "CSV veya XLSX dosyası gerekli.", "FILE_REQUIRED");
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    const existing = await database.importJob.findUnique({
      where: { organizationId_contentHash: { organizationId, contentHash } },
    });
    if (existing) return Response.json({ data: existing });

    let parsed: Awaited<ReturnType<typeof parseCatalogFile>>;
    try {
      parsed = await parseCatalogFile(buffer, file.name);
    } catch (error) {
      throw new HttpError(
        422,
        error instanceof Error ? error.message : "Dosya okunamadı.",
        "IMPORT_FILE_INVALID",
      );
    }
    const [brands, categories] = await Promise.all([
      database.brand.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
      database.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, path: true },
      }),
    ]);
    const preview = validateCatalogRows(parsed.rows, { brands, categories });
    const safeName = (file.name.split(/[\\/]/).pop() ?? "urun-import")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 180);
    const job = await database.importJob.create({
      data: {
        organizationId,
        fileName: safeName,
        fileType: parsed.fileType,
        contentHash,
        totalRows: parsed.rows.length,
        validRows: preview.validRows.length,
        invalidRows: preview.rowErrors.length,
        previewRows: preview.validRows,
        rowErrors: preview.rowErrors,
        createdById: user.id,
      },
    });
    return Response.json({ data: job }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return errorResponse(new HttpError(409, "Bu dosya daha önce önizlendi.", "IMPORT_EXISTS"));
    }
    return errorResponse(error);
  }
}
