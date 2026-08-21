"use client";

export default function ErrorPage({
  error: _error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  void _error;
  return (
    <main id="ana-icerik" className="auth-page" tabIndex={-1}>
      <section className="auth-card" aria-labelledby="error-title">
        <p className="eyebrow">Geçici bir sorun oluştu</p>
        <h1 id="error-title">Bu sayfa şu anda açılamıyor.</h1>
        <p className="auth-description">
          Lütfen tekrar deneyin. Sorun sürerse biraz sonra yeniden kontrol edin.
        </p>
        <button className="button button-primary" onClick={reset} type="button">
          Tekrar dene
        </button>
      </section>
    </main>
  );
}
