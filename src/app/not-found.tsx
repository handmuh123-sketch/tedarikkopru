import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main id="ana-icerik" className="auth-page" tabIndex={-1}>
      <section className="auth-card" aria-labelledby="not-found-title">
        <p className="eyebrow">Sayfa bulunamadı</p>
        <h1 id="not-found-title">Aradığınız sayfaya ulaşamadık.</h1>
        <p className="auth-description">
          Bağlantı eski olabilir veya bu sayfa artık kullanılamıyor olabilir.
        </p>
        <Link className="button button-primary" href="/urunler">
          Ürünlere dön
        </Link>
      </section>
    </main>
  );
}
