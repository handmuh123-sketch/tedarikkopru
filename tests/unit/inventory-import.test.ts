import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildCatalogCsv,
  parseCatalogFile,
  safeSpreadsheetCell,
} from "@/modules/catalog/application/catalog-file";
import { validateCatalogRows } from "@/modules/catalog/application/import-preview";
import { assertInventoryTarget, availableStock } from "@/modules/inventory/domain/inventory-rules";

const references = {
  brands: [{ id: "brand-1", name: "KöprüTech" }],
  categories: [
    { id: "category-1", name: "Şarj Kabloları", path: "telefon-aksesuarlari/sarj-kablolari" },
  ],
};

describe("Faz 2B stok ve dosya kuralları", () => {
  it("kullanılabilir stoğu safety stock sonrası hesaplar ve negatif hedefi reddeder", () => {
    expect(availableStock(20, 3)).toBe(17);
    expect(availableStock(2, 5)).toBe(0);
    expect(() => assertInventoryTarget(-1, 0)).toThrow("negatif");
    expect(() => assertInventoryTarget(1, -1)).toThrow("negatif");
  });

  it.each(["=1+1", "+SUM(A1:A2)", "-10+20", "@cmd", '  =HYPERLINK("x")'])(
    "formula başlangıcını exportta nötrler: %s",
    (value) => {
      expect(safeSpreadsheetCell(value)).toBe(`'${value}`);
      expect(buildCatalogCsv([{ title: value }])).toContain(`"'${value.replaceAll('"', '""')}"`);
    },
  );

  it("CSV satırlarını önizler ve hatayı satır numarasıyla ayırır", async () => {
    const csv = [
      "supplier_sku,title,brand,category_path,variant_name,description,vat_rate,unit_price,moq,quantity_step,stock,safety_stock,handling_days",
      "TEST-OK,Güvenli Kablo,KöprüTech,telefon-aksesuarlari/sarj-kablolari,Standart,En az yirmi karakter uzunluğunda güvenli ürün açıklaması,20,129.90,10,5,25,3,2",
      "TEST-BAD,Hatalı,Kayıp Marka,bilinmeyen,Standart,kısa,20,0,0,0,-1,0,2",
    ].join("\n");
    const parsed = await parseCatalogFile(Buffer.from(csv, "utf8"), "urunler.csv");
    const preview = validateCatalogRows(parsed.rows, references);
    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0]).toMatchObject({ sku: "TEST-OK", priceAmountMinor: 12990 });
    expect(preview.rowErrors).toHaveLength(1);
    expect(preview.rowErrors[0]?.rowNumber).toBe(3);
  });

  it("XLSX ilk çalışma sayfasını aynı önizleme modeline dönüştürür", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ürünler");
    sheet.addRow([
      "supplier_sku",
      "title",
      "brand",
      "category_path",
      "variant_name",
      "description",
      "vat_rate",
      "unit_price",
      "moq",
      "quantity_step",
      "stock",
      "safety_stock",
      "handling_days",
    ]);
    sheet.addRow([
      "XLSX-OK",
      "XLSX Pilot Kablo",
      "KöprüTech",
      "telefon-aksesuarlari/sarj-kablolari",
      "Standart",
      "XLSX önizleme testi için yeterince uzun ürün açıklaması.",
      20,
      149.9,
      5,
      5,
      40,
      4,
      2,
    ]);
    const bytes = await workbook.xlsx.writeBuffer();
    const parsed = await parseCatalogFile(Buffer.from(bytes), "urunler.xlsx");
    const preview = validateCatalogRows(parsed.rows, references);
    expect(preview.rowErrors).toEqual([]);
    expect(preview.validRows[0]).toMatchObject({ sku: "XLSX-OK", stock: 40 });
  });
});
