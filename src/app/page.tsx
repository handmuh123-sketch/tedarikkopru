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
    detail:
      "Trendyol hazırlığını kontrol edin; ileride doğrudan mağaza bağlantılarıyla yayınlayın.",
  },
] as const;

const rolePaths = [
  {
    eyebrow: "Pazaryeri satıcısı için",
    title: "Ürün bulmaktan satışa hazırlığa kadar daha kısa yol.",
    detail:
      "Dağınık Excel dosyaları ve mesaj trafiği yerine; ürün, fiyat, stok, favori, sipariş ve pazaryeri hazırlığını aynı panelde yönetin.",
    points: [
      "Stokta olan ürünleri keşfedin",
      "Favori listenizi satış havuzuna dönüştürün",
      "Pazaryeri veri eksiklerini yayından önce görün",
    ],
    href: "/urunler",
    action: "Kataloğu incele",
    tone: "buyer",
  },
  {
    eyebrow: "Toptancı için",
    title: "Kataloğunuzu daha düzenli ve erişilebilir yönetin.",
    detail:
      "Ürünleri, varyantları ve stokları tek merkezden yönetin; onaylı alıcılara kontrollü biçimde açın ve sipariş operasyonunu takip edin.",
    points: [
      "Ürün ve varyant kataloğu",
      "Stok hareketleri ve güvenli rezervasyon",
      "Sipariş, teklif, kargo ve iade akışları",
    ],
    href: "/kayit",
    action: "Tedarikçi hesabı oluştur",
    tone: "supplier",
  },
] as const;

const marketplaceSteps = [
  {
    number: "01",
    title: "Seç",
    detail: "Katalogdan satmak istediğiniz ürünleri favorilerinize alın.",
  },
  {
    number: "02",
    title: "Kontrol et",
    detail: "Kategori, marka, özellik ve görsel hazırlığını ürün bazında görün.",
  },
  {
    number: "03",
    title: "Hazırla",
    detail: "XML dışa aktarımını veya kontrollü pazaryeri önizlemesini kullanın.",
  },
] as const;

const faqs = [
  {
    question: "TedarikKöprü kimler için?",
    answer:
      "Türkiye'deki toptancılar, markalar ve pazaryerlerinde satış yapan işletmeler için tasarlanan B2B tedarik platformudur.",
  },
  {
    question: "Ürünleri doğrudan Trendyol'a gönderebilir miyim?",
    answer:
      "Platformda Trendyol veri hazırlığı, eşleştirme ve önizleme altyapısı bulunur. Gerçek mağaza bağlantısı yalnız gerekli canlı kimlik bilgileri ve kontrollü entegrasyon adımları tamamlandığında devreye alınır.",
  },
  {
    question: "Tedarikçi stokları nasıl korunuyor?",
    answer:
      "Stok hareketleri kayıt altındadır; checkout sırasında rezervasyon ve kullanılabilir stok kontrolleri uygulanır. Amaç aynı stokun birden fazla siparişte kullanılmasını önlemektir.",
  },
  {
    question: "İşletme doğrulaması neden gerekli?",
    answer:
      "B2B işlemlerinde tarafların yetkisini ve işletme bağlamını ayırmak için doğrulama akışı kullanılır. Roller ve erişimler sunucu tarafında ayrıca kontrol edilir.",
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
          <a className="nav-section-link" href="#nasil-calisir">
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

        <section className="role-section page-shell" aria-labelledby="role-title">
          <div className="section-heading premium-section-heading">
            <p className="eyebrow">İki taraf, tek operasyon</p>
            <h2 id="role-title">Hangi tarafta olursanız olun, dağınıklığı azaltın.</h2>
            <p>
              TedarikKöprü; alıcı ve tedarikçi ekranlarını aynı kalıba sıkıştırmak yerine, her role
              ihtiyacı olan işlemleri öne çıkarır.
            </p>
          </div>
          <div className="role-grid">
            {rolePaths.map((role) => (
              <article className={`role-card role-card-${role.tone}`} key={role.eyebrow}>
                <p className="eyebrow">{role.eyebrow}</p>
                <h3>{role.title}</h3>
                <p>{role.detail}</p>
                <ul>
                  {role.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link className="role-card-link" href={role.href}>
                  {role.action} <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section
          className="marketplace-showcase"
          id="nasil-calisir"
          aria-labelledby="marketplace-title"
        >
          <div className="page-shell marketplace-showcase-inner">
            <div className="marketplace-copy">
              <p className="eyebrow">Pazaryeri hazırlığı</p>
              <h2 id="marketplace-title">
                Ürünü seçtikten sonra ne eksik olduğunu tahmin etmeyin.
              </h2>
              <p>
                Favorileriniz satış havuzunuz olur. TedarikKöprü, ürün verisini pazaryeri hazırlığı
                açısından kontrol eder ve eksikleri yayın aşamasına gelmeden görünür kılar.
              </p>
              <div className="marketplace-actions">
                <Link className="button button-primary" href="/panel/entegrasyonlar">
                  Pazaryeri merkezini aç
                </Link>
                <Link className="button button-dark-ghost" href="/panel/favoriler">
                  Favorilerimi gör
                </Link>
              </div>
            </div>
            <div className="marketplace-step-grid" aria-label="Pazaryeri hazırlık adımları">
              {marketplaceSteps.map((step) => (
                <article className="marketplace-step" key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
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

        <section className="faq-section page-shell" aria-labelledby="faq-title">
          <div className="section-heading premium-section-heading">
            <p className="eyebrow">Kısa cevaplar</p>
            <h2 id="faq-title">Merak edilenler.</h2>
          </div>
          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <details className="faq-item" key={faq.question} open={index === 0}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta page-shell" aria-labelledby="final-cta-title">
          <div>
            <p className="eyebrow">Tedarik operasyonunu sadeleştirin</p>
            <h2 id="final-cta-title">Bir sonraki satılabilir ürününüz katalogda olabilir.</h2>
            <p>
              Ürünleri inceleyin veya işletme hesabınızı oluşturup kendi çalışma alanınızı açın.
            </p>
          </div>
          <div className="final-cta-actions">
            <Link className="button button-primary" href="/urunler">
              Kataloğa git
            </Link>
            <Link className="button button-secondary" href="/kayit">
              Hesap oluştur
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer premium-footer">
        <div className="page-shell premium-footer-grid">
          <div>
            <span className="brand footer-brand">
              <span className="brand-mark" aria-hidden="true">
                TK
              </span>
              <span>TedarikKöprü</span>
            </span>
            <p>Toptancı ile pazaryeri satıcısı arasında daha düzenli bir ticaret köprüsü.</p>
          </div>
          <nav aria-label="Alt bilgi bağlantıları">
            <Link href="/urunler">Ürünler</Link>
            <Link href="/panel">Panel</Link>
            <Link href="/giris">Giriş</Link>
            <Link href="/kayit">Kayıt</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
