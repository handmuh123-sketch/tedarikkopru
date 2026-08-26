import Link from "next/link";
import { getFoundationCapabilities } from "@/modules/system";

const trustPoints = [
  "Doğrulanmış işletme odağı",
  "Türkiye operasyonlarına uygun temel",
  "Canlı entegrasyonlar varsayılan kapalı",
] as const;

export default function HomePage() {
  const capabilities = getFoundationCapabilities();

  return (
    <>
      <header className="site-header page-shell">
        <a className="brand" href="#ana-icerik" aria-label="TedarikKöprü ana sayfa">
          <span className="brand-mark" aria-hidden="true">
            TK
          </span>
          <span>TedarikKöprü</span>
        </a>
        <nav aria-label="Sayfa bağlantıları">
          <Link className="nav-products" href="/urunler">
            Ürünler
          </Link>
          <a className="nav-section-link" href="#altyapi">
            Pilot akışları
          </a>
          <a className="nav-section-link" href="#guven">
            Güven yaklaşımı
          </a>
          <a className="nav-status" href="/api/health/live">
            Sistem durumu
          </a>
        </nav>
      </header>

      <main id="ana-icerik" tabIndex={-1}>
        <section className="hero page-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Pilot MVP · B2B tedarik</p>
            <h1 id="hero-title">İşletmeler arası tedarik için güvenilir bir köprü.</h1>
            <p className="hero-lead">
              TedarikKöprü; doğrulanmış tedarikçileri ve alıcı işletmeleri katalog, teklif, sipariş,
              ödeme ve teslimat süreçlerinde güvenle buluşturur.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/urunler">
                Pilot ürünleri incele
              </Link>
              <Link className="button button-secondary" href="/kayit">
                İşletme hesabı oluştur
              </Link>
            </div>
            <ul className="trust-list" aria-label="Temel güven ilkeleri">
              {trustPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <aside className="foundation-card" aria-label="Pilot özeti">
            <div className="card-topline">
              <span>Pilot MVP</span>
              <span className="status-dot">Çalışıyor</span>
            </div>
            <div className="bridge-visual" aria-hidden="true">
              <span className="bridge-node bridge-node-left">T</span>
              <span className="bridge-line" />
              <span className="bridge-node bridge-node-right">A</span>
            </div>
            <dl className="metric-grid">
              <div>
                <dt>Mimari</dt>
                <dd>Modüler monolit</dd>
              </div>
              <div>
                <dt>Yerel veri</dt>
                <dd>PostgreSQL</dd>
              </div>
              <div>
                <dt>Saat dilimi</dt>
                <dd>Europe/Istanbul</dd>
              </div>
              <div>
                <dt>Canlı servis</dt>
                <dd>Kapalı</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="foundation-section" id="altyapi" aria-labelledby="foundation-title">
          <div className="page-shell">
            <div className="section-heading">
              <p className="eyebrow">Çalışan pilot akışları</p>
              <h2 id="foundation-title">Tedarik sürecinin kritik adımları tek yerde.</h2>
              <p>
                Onaylı katalog, tek tedarikçili checkout, pilot ödeme, manuel kargo, iade ve teklif
                akışları güvenli durum geçişleriyle çalışır.
              </p>
            </div>
            <div className="capability-grid">
              {capabilities.map((capability, index) => (
                <article className="capability-card" key={capability.title}>
                  <div className="capability-number" aria-hidden="true">
                    0{index + 1}
                  </div>
                  <span className={`capability-status status-${capability.status}`}>
                    {capability.status}
                  </span>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="trust-section page-shell" id="guven" aria-labelledby="trust-title">
          <div>
            <p className="eyebrow">Deny by default</p>
            <h2 id="trust-title">Güven, sonradan eklenen bir katman değil.</h2>
          </div>
          <div className="trust-copy">
            <p>
              Secret değerleri istemciye taşınmaz; hassas alanlar loglarda maskelenir ve dış
              servisler açıkça etkinleştirilmedikçe devreye girmez.
            </p>
            <a href="/api/health/ready">Veritabanı hazırlık kontrolünü aç →</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <span>TedarikKöprü</span>
          <span>Pilot MVP · yerel geliştirme</span>
        </div>
      </footer>
    </>
  );
}
