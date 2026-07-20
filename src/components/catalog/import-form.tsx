"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/react/use-hydrated";

type PreviewJob = {
  id: string;
  status: "PREVIEW_READY" | "APPLIED" | "FAILED";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  previewRows: Array<{ rowNumber: number; sku: string; title: string; stock: number }>;
  rowErrors: Array<{ rowNumber: number; errors: string[] }>;
};

export function CatalogImportForm({ organizationId }: { organizationId: string }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [job, setJob] = useState<PreviewJob | null>(null);

  async function preview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setJob(null);
    const response = await fetch(`/api/v1/organizations/${organizationId}/imports/preview`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? "Dosya önizlenemedi.");
      setBusy(false);
      return;
    }
    setJob(result.data);
    setMessage(
      result.data.status === "APPLIED"
        ? "Bu dosya daha önce uygulandı."
        : "Önizleme hazır. Henüz ürün veya stok yazılmadı.",
    );
    setBusy(false);
  }

  async function confirm() {
    if (!job) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/imports/${job.id}/confirm`,
      { method: "POST" },
    );
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? "Import uygulanamadı.");
      setBusy(false);
      return;
    }
    setJob({ ...job, status: "APPLIED" });
    setMessage(`${result.data.appliedRows ?? job.validRows} geçerli satır uygulandı.`);
    setBusy(false);
  }

  return (
    <div className="import-workspace">
      <form className="auth-form" onSubmit={preview}>
        <label>
          CSV veya XLSX ürün dosyası
          <input name="file" type="file" accept=".csv,.xlsx" required />
        </label>
        <p>
          En fazla 2 MB / 500 satır. Gerekli kolonlar: supplier_sku, title, brand, category_path,
          description, unit_price, moq, quantity_step ve stock.
        </p>
        <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
          {busy ? "İşleniyor…" : "Önizleme oluştur"}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      {job && (
        <section className="dashboard-card" aria-labelledby="import-preview-title">
          <h2 id="import-preview-title">Import önizlemesi</h2>
          <p>
            Toplam {job.totalRows} · Geçerli {job.validRows} · Hatalı {job.invalidRows}
          </p>
          {job.previewRows.length > 0 && (
            <div className="table-scroll">
              <table>
                <caption>Uygulanabilecek satırlar</caption>
                <thead>
                  <tr>
                    <th>Satır</th>
                    <th>SKU</th>
                    <th>Ürün</th>
                    <th>Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {job.previewRows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>{row.sku}</td>
                      <td>{row.title}</td>
                      <td>{row.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {job.rowErrors.length > 0 && (
            <div className="import-errors" role="region" aria-label="Satır hataları">
              <h3>Satır bazlı hata raporu</h3>
              <ul>
                {job.rowErrors.map((row) => (
                  <li key={row.rowNumber}>
                    Satır {row.rowNumber}: {row.errors.join(" ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.status === "PREVIEW_READY" && job.validRows > 0 && (
            <button
              className="button button-primary"
              type="button"
              onClick={confirm}
              disabled={busy}
            >
              Geçerli satırları uygula
            </button>
          )}
          {job.status === "APPLIED" && <span className="status-pill">Uygulandı</span>}
        </section>
      )}
    </div>
  );
}
