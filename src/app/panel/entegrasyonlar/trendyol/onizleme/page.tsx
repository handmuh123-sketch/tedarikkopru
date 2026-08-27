import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function TrendyolPreviewPage() {
  const { user } = await requirePageUser();
  const preview = await buildTrendyolPreview(user.id);

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <Breadcrumbs
        items={[
          { label: "Panel", href: "/panel" },
          { label: "Pazaryeri", href: "/panel/entegrasyonlar" },
          { label: "Ürün önizlemesi" },
        ]}
      />
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Trendyol · önizleme</p>
          <h1>Ürünleriniz satışa hazır mı?</h1>
          <p>Bu ekran yalnız veri doğrulaması yapar; canlı Trendyol isteği göndermez.</p>
        </div>
      </header>
      <section className="dashboard-card preview-summary">
        <div className="card-heading-row">
          <div>
            <h2>Özet</h2>
            <p>
              Toplam {preview.products.length} varyant · Hazır {preview.validation.validCount} ·
              Eksik {preview.validation.invalidCount}
            </p>
          </div>
          <StatusBadge
            label={preview.validation.invalidCount === 0 ? "Hazır" : "Kontrol gerekli"}
            tone={preview.validation.invalidCount === 0 ? "ready" : "missing"}
          />
        </div>
        <div className="dashboard-actions">
          <Link className="button button-primary" href="/panel/entegrasyonlar">
            Bağlantı ayarlarına git
          </Link>
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/export">
            JSON indir
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
        <section className="empty-state">
          <h2>Önizlenecek stoklu favori ürün yok</h2>
          <p>Favorilere stoklu ürün eklediğinizde ürün kartlarını burada kontrol edebilirsiniz.</p>
          <Link className="button button-primary" href="/urunler">
            Ürünleri keşfet
          </Link>
        </section>
      ) : (
        <section
          className="dashboard-grid preview-product-grid"
          aria-label="Trendyol ürün önizlemeleri"
        >
          {preview.products.map((item) => (
            <article className="dashboard-card preview-product-card" key={item.variantId}>
              <div className="card-heading-row">
                {item.display.image ? (
                  <Image src={item.display.image} alt="" width={72} height={72} unoptimized />
                ) : (
                  <div className="product-image-placeholder" aria-hidden="true" />
                )}
                <StatusBadge
                  label={item.validation.valid ? "Hazır" : "Eksik bilgi"}
                  tone={item.validation.valid ? "ready" : "missing"}
                />
              </div>
              <h2>{item.display.title}</h2>
              <dl className="preview-data-list">
                <div>
                  <dt>SKU</dt>
                  <dd>{item.display.sku}</dd>
                </div>
                <div>
                  <dt>Barkod</dt>
                  <dd>{item.display.barcode ?? "Eksik"}</dd>
                </div>
                <div>
                  <dt>Stok</dt>
                  <dd>{item.display.availableStock}</dd>
                </div>
                <div>
                  <dt>Fiyat</dt>
                  <dd>{money.format(item.display.priceMinor / 100)}</dd>
                </div>
              </dl>
              {item.validation.errors.length ? (
                <div className="preview-issues">
                  <p>Satışa hazırlamak için aşağıdakileri tamamlayın:</p>
                  <ul>
                    {item.validation.errors.map((issue) => (
                      <li key={`${issue.field}-${issue.code}`}>{issue.message}</li>
                    ))}
                  </ul>
                  <details className="preview-technical-details">
                    <summary>Teknik ayrıntılar</summary>
                    <ul>
                      {item.validation.errors.map((issue) => (
                        <li key={`technical-${issue.field}-${issue.code}`}>{issue.code}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              ) : (
                <p>Özellik eşleşmeleri: {item.mappingSources.attributes.join(", ") || "Eksik"}</p>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
