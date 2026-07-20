import { z } from "zod";
import type { CatalogRawRow } from "@/modules/catalog/application/catalog-file";

const integer = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : Number.NaN);
const priceMinor = (value: string) => {
  const normalized = value.trim().replaceAll(" ", "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  const [whole = "0", fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};

export const importPreviewRowSchema = z.object({
  rowNumber: z.number().int().min(2),
  sku: z.string().min(2).max(80),
  barcode: z.string().max(32).nullable(),
  title: z.string().min(3).max(180),
  brandId: z.string().min(1).max(36),
  brandName: z.string().min(1).max(120),
  categoryId: z.string().min(1).max(36),
  categoryPath: z.string().min(1).max(500),
  variantName: z.string().min(2).max(160),
  description: z.string().min(20).max(10_000),
  vatRateBasisPoints: z.number().int().min(0).max(10_000),
  priceAmountMinor: z.number().int().min(1).max(2_000_000_000),
  moq: z.number().int().min(1).max(100_000),
  quantityStep: z.number().int().min(1).max(100_000),
  stock: z.number().int().min(0).max(2_000_000_000),
  safetyStock: z.number().int().min(0).max(2_000_000_000),
  handlingDays: z.number().int().min(0).max(90),
});
export type ImportPreviewRow = z.infer<typeof importPreviewRowSchema>;
export type ImportRowError = { rowNumber: number; errors: string[] };

export function validateCatalogRows(
  rows: CatalogRawRow[],
  references: {
    brands: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string; path: string }>;
  },
) {
  const brandMap = new Map(
    references.brands.map((item) => [item.name.toLocaleLowerCase("tr-TR"), item]),
  );
  const categoryMap = new Map(
    references.categories.flatMap((item) => [
      [item.path.toLocaleLowerCase("tr-TR"), item] as const,
      [item.name.toLocaleLowerCase("tr-TR"), item] as const,
    ]),
  );
  const validRows: ImportPreviewRow[] = [];
  const rowErrors: ImportRowError[] = [];
  const seenSkus = new Set<string>();

  for (const row of rows) {
    const value = row.values;
    const sku = (value.supplier_sku ?? "").trim().toUpperCase();
    const brand = brandMap.get((value.brand ?? "").trim().toLocaleLowerCase("tr-TR"));
    const category = categoryMap.get((value.category_path ?? "").trim().toLocaleLowerCase("tr-TR"));
    const vatPercent = integer(value.vat_rate ?? "20");
    const candidate = {
      rowNumber: row.rowNumber,
      sku,
      barcode: (value.barcode ?? "").trim() || null,
      title: (value.title ?? "").trim(),
      brandId: brand?.id ?? "",
      brandName: brand?.name ?? (value.brand ?? "").trim(),
      categoryId: category?.id ?? "",
      categoryPath: category?.path ?? (value.category_path ?? "").trim(),
      variantName: (value.variant_name ?? "").trim() || "Standart",
      description: (value.description ?? "").trim(),
      vatRateBasisPoints: vatPercent * 100,
      priceAmountMinor: priceMinor(value.unit_price ?? ""),
      moq: integer(value.moq ?? ""),
      quantityStep: integer(value.quantity_step ?? ""),
      stock: integer(value.stock ?? ""),
      safetyStock: integer(value.safety_stock ?? "0"),
      handlingDays: integer(value.handling_days ?? "2"),
    };
    const parsed = importPreviewRowSchema.safeParse(candidate);
    const errors: string[] = [];
    if (!brand) errors.push("Aktif marka eşleşmedi.");
    if (!category) errors.push("Aktif kategori yolu eşleşmedi.");
    if (!/^[A-Z0-9._-]{2,80}$/.test(sku)) errors.push("SKU biçimi geçersiz.");
    if (seenSkus.has(sku)) errors.push("Dosyada aynı SKU birden fazla kez var.");
    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      );
    }
    seenSkus.add(sku);
    if (errors.length > 0)
      rowErrors.push({ rowNumber: row.rowNumber, errors: [...new Set(errors)] });
    else if (parsed.success) validRows.push(parsed.data);
  }
  return { validRows, rowErrors };
}

export function importProductSlug(organizationId: string, sku: string): string {
  return `import-${organizationId.slice(0, 8).toLowerCase()}-${sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`.slice(0, 180);
}
