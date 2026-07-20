import ExcelJS from "exceljs";

const maximumBytes = 2 * 1024 * 1024;
const maximumExpandedBytes = 12 * 1024 * 1024;
const maximumRows = 500;
export const catalogColumns = [
  "supplier_sku",
  "barcode",
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
] as const;

export type CatalogRawRow = { rowNumber: number; values: Record<string, string> };

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("formula" in value) return `=${String(value.formula)}`;
    if ("text" in value) return String(value.text);
    if ("richText" in value) return value.richText.map((item) => item.text).join("");
    if ("result" in value) return String(value.result ?? "");
  }
  return String(value);
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s-]+/g, "_");
}

function parseCsvRows(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("CSV içinde kapanmamış tırnak bulundu.");
  if (cell || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function tableToRows(table: string[][]): CatalogRawRow[] {
  const headers = (table[0] ?? []).map(normalizeHeader);
  if (headers.length === 0) throw new Error("Dosyada başlık satırı bulunamadı.");
  const duplicates = headers.filter((value, index) => value && headers.indexOf(value) !== index);
  if (duplicates.length > 0) throw new Error("Dosyada yinelenen kolon başlığı var.");
  const rows = table
    .slice(1)
    .map((values, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(
        headers.map((header, column) => [header, values[column]?.trim() ?? ""]),
      ),
    }))
    .filter((row) => Object.values(row.values).some(Boolean));
  if (rows.length > maximumRows)
    throw new Error(`En fazla ${maximumRows} veri satırı yüklenebilir.`);
  return rows;
}

function assertSafeZipExpansion(buffer: Buffer): void {
  let expandedBytes = 0;
  let entries = 0;
  for (let offset = 0; offset <= buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    entries += 1;
    expandedBytes += buffer.readUInt32LE(offset + 24);
    if (entries > 1_000 || expandedBytes > maximumExpandedBytes) {
      throw new Error("XLSX açılmış içerik sınırını aşıyor.");
    }
  }
  if (entries === 0) throw new Error("Geçerli XLSX ZIP dizini bulunamadı.");
}

export async function parseCatalogFile(buffer: Buffer, fileName: string) {
  if (buffer.byteLength === 0 || buffer.byteLength > maximumBytes) {
    throw new Error("Dosya boş veya 2 MB sınırını aşıyor.");
  }
  const extension = fileName.toLocaleLowerCase("tr-TR").split(".").pop();
  if (extension === "csv") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
    return { fileType: "csv" as const, rows: tableToRows(parseCsvRows(text)) };
  }
  if (extension === "xlsx") {
    assertSafeZipExpansion(buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("XLSX çalışma sayfası bulunamadı.");
    if (worksheet.actualRowCount > maximumRows + 1)
      throw new Error(`En fazla ${maximumRows} veri satırı yüklenebilir.`);
    const table: string[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      for (let column = 1; column <= worksheet.actualColumnCount; column += 1) {
        values.push(cellText(row.getCell(column).value));
      }
      table.push(values);
    });
    return { fileType: "xlsx" as const, rows: tableToRows(table) };
  }
  throw new Error("Yalnız CSV veya XLSX dosyası yüklenebilir.");
}

export function safeSpreadsheetCell(value: unknown): string {
  const text = String(value ?? "");
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown): string {
  const safe = safeSpreadsheetCell(value);
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildCatalogCsv(rows: Array<Record<string, unknown>>): string {
  return `\uFEFF${catalogColumns.map(csvCell).join(",")}\r\n${rows
    .map((row) => catalogColumns.map((column) => csvCell(row[column])).join(","))
    .join("\r\n")}\r\n`;
}
