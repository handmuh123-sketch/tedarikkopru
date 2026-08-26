import Link from "next/link";
import { getFoundationCapabilities } from "@/modules/system";

const trustPoints = [
  "Doğrulanmış işletme odağı",
  "Toptancıdan pazaryerine tek akış",
  "Canlı entegrasyonlar kontrollü",
] as const;

const quickPoints = [
  {
    title: "Ürünü keşfet",
    detail: "Onaylı tedarikçilerden ürün, stok ve fiyatları tek katalogda karşılaştırın.",
  },
  {
    title: "Favoriye ekle",
    detail: "Satmak istediğiniz ürünleri seçin ve pazaryeri hazırlığını tek yerde yönetin.",
  },
  {
    title: "Pazaryerine taşı",
    detail: "Trendyol hazırlığını kontrol edin; ileride doğrudan mağaza bağlantılarıyla yayınlayın.",
  },
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
            Nasıl çalışır?
          </a>
          <Link className="nav-login" href="/giris">
            Giriş yap
          </Link>
          <Link className="nav-panel" href="/panel">
            Panele git
          </Link>
        </nav>
      </header>

      <main id="ana-icerik" className="home-main" tabIndex={-1}>
        <section className="hero page-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="hero-badge">Toptancıdan pazaryerine yeni nesil B2B köprü</span>
            <p className="eyebrow">Tedarik · katalog · pazaryeri</p>
            <h1 id="hero-title">
              Ürünü bulun, seçin ve <span className="hero-gradient-text">satışa taşıyın.</span>
            </h1>
            <p className="hero-lead">
              TedarikKöprü; toptancıları ve pazaryeri satıcılarını aynı akışta buluşturur. Ürünleri
              keşfedin, favorilerinizi hazırlayın, stok ve siparişleri yönetin; pazaryeri aktarımına
              tek panelden ilerleyin.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/urunler">
                Ürünleri keşfet
              </Link>
              <Link className="button button-secondary" href="/panel">
                Paneli aç
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

          <aside className="hero-visual" aria-label="TedarikKöprü akış özeti">
            <div className="hero-orbit">
              <span className="market-chip market-chip-one">Stok senkronu</span>
              <span className="market-chip market-chip-two">Ürün verisi hazır</span>
              <span className="market-chip market-chip-three">Pazaryeri önizleme</span>
              <div className="hero-flow">
                <div className="hero-flow-node">
                  <div>
                    <strong>Toptancı</strong>
                    <span>Ürün · fiyat · stok</span>
                  </div>
                </div>
                <span className="hero-flow-arrow" aria-hidden="true">
                  →
                </span>
                <div className="hero-flow-node hero-flow-node-center">
                  <div>
                    <strong>TedarikKöprü</strong>
                    <span>Seç · yönet · hazırla</span>
                  </div>
                </div>
                <span className="hero-flow-arrow" aria-hidden="true">
                  →
                </span>
                <div className="hero-flow-node">
                  <div>
                    <strong>Pazaryeri</strong>
                    <span>Trendyol · diğerleri</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="home-quick-strip page-shell" aria-label="TedarikKöprü temel akışı">
          {quickPoints.map((point) => (
            <article className="home-quick-card" key={point.title}>
              <strong>{point.title}</strong>
              <span>{point.detail}</span>
            </article>
          ))}
        </section>

        <section className="foundation-section" id="altyapi" aria-labelledby="foundation-title">
          <div className="page-shell">
            <div className="section-heading">
              <p className="eyebrow">Çalışan pilot akışları</p>
              <h2 id="foundation-title">Tedarik sürecinin kritik adımları tek yerde.</h2>
              <p>
                Onaylı katalog, checkout, ödeme, kargo, iade ve teklif akışları güvenli durum
                geçişleriyle çalışır. Pazaryeri hazırlığı da aynı panelden ilerler.
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
            <p className="eyebrow">Kontrollü büyüme</p>
            <h2 id="trust-title">Güvenli altyapı, daha akıcı bir satış deneyimi.</h2>
          </div>
          <div className="trust-copy">
            <p>
              Hassas bilgiler korunur, işletme rolleri ayrıdır ve canlı pazaryeri işlemleri açıkça
              hazır olmadan devreye girmez. Kullanıcı ise ön tarafta yalnız ihtiyacı olan adımları
              görür.
            </p>
            <Link href="/panel">İşletme paneline geç →</Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <span>TedarikKöprü</span>
          <span>Toptancı ile pazaryeri satıcısı arasında tek köprü</span>
        </div>
      </footer>
    </>
  );
}
