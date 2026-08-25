import Image from "next/image";
import Link from "next/link";

import { requirePageUser } from "@/lib/auth/page-session";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function TrendyolPreviewPage() {
  const { user } = await requirePageUser();
  const preview = await buildTrendyolPreview(user.id);
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Trendyol · PREVIEW</p>
          <h1>Favori ürün aktarım önizlemesi</h1>
        </div>
        <Link className="button button-secondary" href="/panel/entegrasyonlar">
          Entegrasyonlara dön
        </Link>
      </header>
      <section className="dashboard-card">
        <h2>Özet</h2>
        <p>
          Toplam {preview.products.length} varyant · Hazır {preview.validation.validCount} · Hatalı{" "}
          {preview.validation.invalidCount}
        </p>
        <p>Bu ekran yalnız veri doğrulaması yapar; canlı Trendyol isteği göndermez.</p>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/export">
            JSON indir
          </Link>
          <Link className="button button-secondary" href="/panel/favoriler">
            Favorilere git
          </Link>
          {user.platformRole === "PLATFORM_SUPER_ADMIN" ||
          user.platformRole === "PLATFORM_ADMIN" ? (
            <Link className="button button-secondary" href="/admin/entegrasyonlar/trendyol">
              Eşleşmeleri yönet
            </Link>
          ) : null}
        </div>
      </section>
      {preview.products.length === 0 ? (
        <section className="dashboard-card">
          <p>Stoklu favori ürün bulunmuyor.</p>
        </section>
      ) : (
        <section className="dashboard-grid" aria-label="Trendyol ürün önizlemeleri">
          {preview.products.map((item) => (
            <article className="dashboard-card" key={item.variantId}>
              {item.display.image ? (
                <Image src={item.display.image} alt="" width={96} height={96} unoptimized />
              ) : null}
              <span className="status-pill">{item.validation.valid ? "Hazır" : "Eksik"}</span>
              <h2>{item.display.title}</h2>
              <p>SKU: {item.display.sku}</p>
              <p>Barkod: {item.display.barcode ?? "Eksik"}</p>
              <p>Stok: {item.display.availableStock}</p>
              <p>Fiyat: {money.format(item.display.priceMinor / 100)}</p>
              {item.validation.errors.map((issue) => (
                <p key={`${issue.field}-${issue.code}`}>{issue.message}</p>
              ))}
              {!item.validation.errors.length ? (
                <p>Özellik eşleşmeleri: {item.mappingSources.attributes.join(", ") || "Eksik"}</p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
