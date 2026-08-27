"use client";

import { useState, type FormEvent } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type Stage = "organization" | "address" | "document" | "review" | "done";
type ResumeStage = Exclude<Stage, "organization" | "done">;

type OnboardingFlowProps = {
  initialOrganizationId?: string;
  initialStage?: ResumeStage;
};

const stages = [
  { id: "organization", label: "İşletme", description: "İşletmenizin temel bilgilerini ekleyin." },
  { id: "address", label: "Adres", description: "Merkez adresinizi kaydedin." },
  { id: "document", label: "Belge", description: "Doğrulama belgenizi yükleyin." },
  { id: "review", label: "İnceleme", description: "Başvurunuzu incelemeye gönderin." },
] as const;

async function apiJson(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "İşlem tamamlanamadı.");
  return body;
}

export function OnboardingFlow({ initialOrganizationId, initialStage }: OnboardingFlowProps) {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>(initialStage ?? "organization");
  const [organizationId, setOrganizationId] = useState(initialOrganizationId ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const stageIndex = stage === "done" ? stages.length : stages.findIndex(({ id }) => id === stage);
  const minimumStageIndex = initialStage ? stages.findIndex(({ id }) => id === initialStage) : 0;
  const canGoBack = stageIndex > minimumStageIndex && stage !== "done";
  const currentStage = stages[Math.min(stageIndex, stages.length - 1)]!;

  async function createOrganization(form: HTMLFormElement) {
    setBusy(true);
    setStatus("");
    const data = new FormData(form);
    try {
      const result = await apiJson("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
      });
      setOrganizationId(result.data.id);
      setStage("address");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function createAddress(form: HTMLFormElement) {
    setBusy(true);
    setStatus("");
    const data = Object.fromEntries(new FormData(form));
    try {
      await apiJson(`/api/v1/organizations/${organizationId}/addresses`, {
        method: "POST",
        body: JSON.stringify({ ...data, type: "HEADQUARTERS", countryCode: "TR", isDefault: true }),
      });
      setStage("document");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(form: HTMLFormElement) {
    setBusy(true);
    setStatus("");
    const body = new FormData(form);
    try {
      const response = await fetch(
        `/api/v1/organizations/${organizationId}/verification/documents`,
        { method: "POST", body },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Belge yüklenemedi.");
      setStage("review");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function submitApplication() {
    setBusy(true);
    setStatus("");
    try {
      await apiJson(`/api/v1/organizations/${organizationId}/verification/submit`, {
        method: "POST",
        body: "{}",
      });
      setStage("done");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    operation: (form: HTMLFormElement) => Promise<void>,
  ) {
    event.preventDefault();
    void operation(event.currentTarget);
  }

  function goBack() {
    const previousStage = stages[stageIndex - 1];
    if (previousStage) setStage(previousStage.id);
  }

  return (
    <div className="onboarding-card">
      <ol className="steps" aria-label="İşletme doğrulama adımları">
        {stages.map((item, index) => (
          <li
            className={
              index < stageIndex ? "is-complete" : index === stageIndex ? "is-active" : undefined
            }
            key={item.id}
            aria-current={index === stageIndex ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>
      {stage !== "done" ? (
        <header className="onboarding-step-heading">
          <p className="eyebrow">
            Adım {stageIndex + 1} / {stages.length}
          </p>
          <h2>{currentStage.label}</h2>
          <p>{currentStage.description}</p>
        </header>
      ) : null}
      {status ? (
        <p className="form-status error" role="alert">
          {status}
        </p>
      ) : null}
      {stage === "organization" ? (
        <form
          className="auth-form onboarding-form"
          onSubmit={(event) => handleSubmit(event, createOrganization)}
        >
          <fieldset>
            <legend>İşletme bilgileri</legend>
            <div className="two-column">
              <label>
                İşletme türü
                <select name="type" required defaultValue="SUPPLIER" aria-describedby="type-help">
                  <option value="SUPPLIER">Tedarikçi</option>
                  <option value="RESELLER">Alıcı / pazaryeri satıcısı</option>
                  <option value="BOTH">Her ikisi</option>
                </select>
              </label>
              <p id="type-help" className="form-help">
                Satış veya tedarik faaliyetlerinize uygun seçeneği kullanın.
              </p>
              <label>
                Yasal unvan
                <input name="legalName" required minLength={2} autoComplete="organization" />
              </label>
              <label>
                Ticari ad
                <input name="tradeName" required minLength={2} />
              </label>
              <label className="span-two">
                Profil kısa adı
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="ornek-isletme"
                  aria-describedby="slug-help"
                />
                <span id="slug-help" className="form-help">
                  Küçük harf, rakam ve tire kullanın.
                </span>
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Vergi ve iletişim</legend>
            <div className="two-column">
              <label>
                VKN / TCKN
                <input name="taxNumber" required inputMode="numeric" pattern="\\d{10,11}" />
              </label>
              <label>
                Vergi dairesi
                <input name="taxOffice" required />
              </label>
              <label>
                Telefon
                <input name="phone" type="tel" required autoComplete="tel" />
              </label>
              <label>
                İşletme e-postası
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label>
                Yetkili kişi
                <input name="authorizedPerson" required autoComplete="name" />
              </label>
              <label>
                Sektör <span className="field-optional">(isteğe bağlı)</span>
                <input name="sector" />
              </label>
            </div>
          </fieldset>
          <div className="onboarding-actions">
            <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
              İşletmeyi oluştur
            </button>
          </div>
        </form>
      ) : null}
      {stage === "address" ? (
        <form
          className="auth-form onboarding-form"
          onSubmit={(event) => handleSubmit(event, createAddress)}
        >
          <fieldset>
            <legend>Merkez adresi</legend>
            <div className="two-column">
              <label>
                Adres başlığı
                <input name="title" defaultValue="Merkez" required />
              </label>
              <label>
                İlgili kişi
                <input name="contactName" required autoComplete="name" />
              </label>
              <label>
                Telefon
                <input name="phone" type="tel" required autoComplete="tel" />
              </label>
              <label>
                İl
                <input name="city" required autoComplete="address-level1" />
              </label>
              <label>
                İlçe
                <input name="district" required autoComplete="address-level2" />
              </label>
              <label>
                Mahalle <span className="field-optional">(isteğe bağlı)</span>
                <input name="neighborhood" />
              </label>
              <label>
                Posta kodu <span className="field-optional">(isteğe bağlı)</span>
                <input name="postalCode" autoComplete="postal-code" />
              </label>
              <label className="span-two">
                Açık adres
                <textarea name="line1" required minLength={5} autoComplete="street-address" />
              </label>
            </div>
          </fieldset>
          <div className="onboarding-actions">
            {canGoBack ? (
              <button className="button button-secondary" type="button" onClick={goBack}>
                Geri
              </button>
            ) : null}
            <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
              Adresi kaydet
            </button>
          </div>
        </form>
      ) : null}
      {stage === "document" ? (
        <form
          className="auth-form onboarding-form"
          onSubmit={(event) => handleSubmit(event, uploadDocument)}
        >
          <fieldset>
            <legend>Doğrulama belgesi</legend>
            <label>
              Belge türü
              <select name="type">
                <option value="TAX_CERTIFICATE">Vergi levhası</option>
                <option value="TRADE_REGISTRY">Ticaret sicil gazetesi</option>
                <option value="AUTHORIZED_SIGNATURE">İmza sirküleri</option>
              </select>
            </label>
            <label>
              Şirket belgesi
              <input
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                required
                aria-describedby="file-help"
              />
            </label>
            <p id="file-help" className="form-help">
              PDF, JPEG veya PNG; en fazla 5 MB. Belge yalnız yetkili kullanıcılarca açılabilir.
            </p>
          </fieldset>
          <div className="onboarding-actions">
            {canGoBack ? (
              <button className="button button-secondary" type="button" onClick={goBack}>
                Geri
              </button>
            ) : null}
            <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
              Belgeyi güvenli yükle
            </button>
          </div>
        </form>
      ) : null}
      {stage === "review" ? (
        <div className="onboarding-review">
          <p>İşletme, merkez adresi ve belge kaydedildi.</p>
          <p>Gönderdikten sonra bilgiler admin inceleme kuyruğuna alınır.</p>
          <div className="onboarding-actions">
            {canGoBack ? (
              <button className="button button-secondary" type="button" onClick={goBack}>
                Geri
              </button>
            ) : null}
            <button
              className="button button-primary"
              disabled={!hydrated || busy}
              onClick={submitApplication}
            >
              Doğrulamaya gönder
            </button>
          </div>
        </div>
      ) : null}
      {stage === "done" ? (
        <div className="onboarding-review">
          <p className="form-status success" role="status">
            Başvurunuz inceleme kuyruğuna alındı.
          </p>
          <a className="button button-secondary" href="/panel">
            Panele dön
          </a>
        </div>
      ) : null}
    </div>
  );
}
