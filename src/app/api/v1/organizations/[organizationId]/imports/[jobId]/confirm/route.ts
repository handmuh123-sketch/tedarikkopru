import { z } from "zod";
import { requireOrganizationPermission } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { resolveRequestId } from "@/lib/logging/request-id";
import { consumeRateLimit, requestNetworkKey } from "@/lib/security/rate-limit";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import {
  importPreviewRowSchema,
  importProductSlug,
} from "@/modules/catalog/application/import-preview";
import { adjustInventoryInTransaction } from "@/modules/inventory/application/inventory-service";

type Context = { params: Promise<{ organizationId: string; jobId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { organizationId, jobId } = await context.params;
    const { user } = await requireOrganizationPermission(request, organizationId, "catalog:import");
    const limit = await consumeRateLimit(`catalog-import-confirm:${user.id}:${organizationId}`, {
      window: 600,
      max: 12,
    });
    if (!limit.allowed) throw new HttpError(429, "Çok fazla import onayı.", "RATE_LIMITED");
    const job = await database.importJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new HttpError(404, "Import işi bulunamadı.", "IMPORT_NOT_FOUND");
    if (job.status === "APPLIED")
      return Response.json({ data: { id: job.id, status: job.status } });
    if (job.status !== "PREVIEW_READY")
      throw new HttpError(409, "Import işi uygulanabilir durumda değil.", "IMPORT_STATE_CONFLICT");
    const rows = z.array(importPreviewRowSchema).parse(job.previewRows);
    if (rows.length === 0)
      throw new HttpError(409, "Uygulanabilecek geçerli satır yok.", "IMPORT_NO_VALID_ROWS");
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    const network = requestNetworkKey(request);

    await database.$transaction(async (transaction) => {
      const claimed = await transaction.importJob.updateMany({
        where: { id: job.id, organizationId, status: "PREVIEW_READY" },
        data: { status: "APPLIED", completedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new HttpError(409, "Import başka bir işlemde uygulandı.", "IMPORT_STATE_CONFLICT");

      for (const row of rows) {
        const [category, brand] = await Promise.all([
          transaction.category.findFirst({ where: { id: row.categoryId, isActive: true } }),
          transaction.brand.findFirst({ where: { id: row.brandId, status: "ACTIVE" } }),
        ]);
        if (!category || !brand)
          throw new HttpError(
            409,
            `Satır ${row.rowNumber} kategori/marka eşleşmesi değişti.`,
            "IMPORT_REFERENCE_CHANGED",
          );
        const existing = await transaction.productVariant.findUnique({
          where: {
            supplierOrganizationId_sku: { supplierOrganizationId: organizationId, sku: row.sku },
          },
          include: { product: true, inventory: true },
        });
        let variantId: string;
        let expectedVersion = 0;
        if (existing) {
          if (existing.product.status === "ARCHIVED") {
            throw new HttpError(
              409,
              `Satır ${row.rowNumber} arşivlenmiş ürünü değiştiremez.`,
              "IMPORT_PRODUCT_ARCHIVED",
            );
          }
          await transaction.product.update({
            where: { id: existing.productId },
            data: {
              categoryId: row.categoryId,
              brandId: row.brandId,
              title: row.title,
              shortDescription: row.description.slice(0, 320),
              description: row.description,
              vatRateBasisPoints: row.vatRateBasisPoints,
              handlingDays: row.handlingDays,
              status: "DRAFT",
              moderationNote: null,
              publishedAt: null,
            },
          });
          await transaction.productVariant.update({
            where: { id: existing.id },
            data: {
              barcode: row.barcode,
              title: row.variantName,
              priceAmountMinor: row.priceAmountMinor,
              moq: row.moq,
              quantityStep: row.quantityStep,
              status: "ACTIVE",
            },
          });
          variantId = existing.id;
          expectedVersion = existing.inventory?.version ?? 0;
        } else {
          const product = await transaction.product.create({
            data: {
              supplierOrganizationId: organizationId,
              categoryId: row.categoryId,
              brandId: row.brandId,
              title: row.title,
              slug: importProductSlug(organizationId, row.sku),
              shortDescription: row.description.slice(0, 320),
              description: row.description,
              vatRateBasisPoints: row.vatRateBasisPoints,
              handlingDays: row.handlingDays,
              status: "DRAFT",
              attributes: {},
            },
          });
          const variant = await transaction.productVariant.create({
            data: {
              productId: product.id,
              supplierOrganizationId: organizationId,
              sku: row.sku,
              barcode: row.barcode,
              title: row.variantName,
              optionValues: {},
              packageQuantity: 1,
              moq: row.moq,
              quantityStep: row.quantityStep,
              priceAmountMinor: row.priceAmountMinor,
              currency: "TRY",
            },
          });
          variantId = variant.id;
        }
        await adjustInventoryInTransaction(transaction, {
          organizationId,
          variantId,
          onHand: row.stock,
          safetyStock: row.safetyStock,
          expectedVersion,
          reason: `Import satırı ${row.rowNumber}`,
          actorUserId: user.id,
          movementType: "IMPORT",
          referenceType: "ImportJob",
          referenceId: job.id,
          requestId,
          network,
        });
      }
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: user.id,
          organizationId,
          action: "catalog.import_applied",
          targetType: "ImportJob",
          targetId: job.id,
          after: { appliedRows: rows.length, invalidRows: job.invalidRows },
          requestId,
          network,
        }),
      });
    });
    return Response.json({ data: { id: job.id, status: "APPLIED", appliedRows: rows.length } });
  } catch (error) {
    if (error instanceof z.ZodError)
      return errorResponse(
        new HttpError(409, "Import önizleme verisi geçersiz.", "IMPORT_PREVIEW_INVALID"),
      );
    return errorResponse(error);
  }
}
