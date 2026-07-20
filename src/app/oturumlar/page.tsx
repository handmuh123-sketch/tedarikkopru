import { SessionsList } from "@/components/auth/sessions-list";
import { requirePageUser } from "@/lib/auth/page-session";
export default async function SessionsPage() {
  await requirePageUser();
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Hesap güvenliği</p>
          <h1>Açık oturumlar</h1>
          <p>Tanımadığınız bir cihazı anında kapatın.</p>
        </div>
        <a className="button button-secondary" href="/panel">
          Panele dön
        </a>
      </header>
      <SessionsList />
    </main>
  );
}
