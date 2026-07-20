import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requirePageUser } from "@/lib/auth/page-session";
export default async function OnboardingPage() {
  await requirePageUser();
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">İşletme onboarding</p>
          <h1>İşletmenizi doğrulamaya hazırlayın.</h1>
        </div>
        <a className="button button-secondary" href="/panel">
          Panele dön
        </a>
      </header>
      <OnboardingFlow />
    </main>
  );
}
