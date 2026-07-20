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
          <a href="#altyapi">Altyapı</a>
          <a href="#guven">Güven yaklaşımı</a>
          <a className="nav-status" href="/api/health/live">
            Sistem durumu
          </a>
        </nav>
      </header>

      <main id="ana-icerik" tabIndex={-1}>
        <section className="hero page-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Faz 1 · Güvenli işletme kimliği</p>
            <h1 id="hero-title">İşletmeler arası tedarik için güvenilir bir köprü.</h1>
            <p className="hero-lead">
              TedarikKöprü; tedarikçileri ve pazaryeri satıcısı işletmeleri, doğrulanabilir ve
              izlenebilir süreçler üzerinde buluşturmak için kuruluyor.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/kayit">
                İşletme hesabı oluştur
              </a>
              <a className="button button-secondary" href="/giris">
                Giriş yap
              </a>
            </div>
            <ul className="trust-list" aria-label="Temel güven ilkeleri">
              {trustPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <aside className="foundation-card" aria-label="Foundation özeti">
            <div className="card-topline">
              <span>Foundation / 00</span>
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
              <p className="eyebrow">Gözlemlenebilir başlangıç</p>
              <h2 id="foundation-title">Temel bileşenler görünür ve sınırları belirli.</h2>
              <p>
                Bu aşama ürün akışlarını taklit etmez. Sonraki fazların güvenle kurulacağı çalışma,
                veri ve kalite altyapısını sağlar.
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
          <span>Faz 1 · kimlik, işletme ve doğrulama</span>
        </div>
      </footer>
    </>
  );
}
