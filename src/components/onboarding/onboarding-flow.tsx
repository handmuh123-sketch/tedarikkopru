"use client";

import { useState, type FormEvent } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type Stage = "organization" | "address" | "document" | "review" | "done";

async function apiJson(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "İşlem tamamlanamadı.");
  return body;
}

export function OnboardingFlow() {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>("organization");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="onboarding-card">
      <ol className="steps" aria-label="İşletme doğrulama adımları">
        <li>İşletme</li>
        <li>Adres</li>
        <li>Belge</li>
        <li>İnceleme</li>
      </ol>
      {status && (
        <p className="form-status error" role="alert">
          {status}
        </p>
      )}
      {stage === "organization" && (
        <form
          className="auth-form two-column"
          onSubmit={(event) => handleSubmit(event, createOrganization)}
        >
          <label>
            İşletme türü
            <select name="type" required defaultValue="SUPPLIER">
              <option value="SUPPLIER">Tedarikçi</option>
              <option value="RESELLER">Alıcı / pazaryeri satıcısı</option>
              <option value="BOTH">Her ikisi</option>
            </select>
          </label>
          <label>
            Yasal unvan
            <input name="legalName" required minLength={2} />
          </label>
          <label>
            Ticari ad
            <input name="tradeName" required minLength={2} />
          </label>
          <label>
            Profil kısa adı
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="ornek-isletme"
            />
          </label>
          <label>
            VKN / TCKN
            <input name="taxNumber" required inputMode="numeric" pattern="\d{10,11}" />
          </label>
          <label>
            Vergi dairesi
            <input name="taxOffice" required />
          </label>
          <label>
            Telefon
            <input name="phone" type="tel" required />
          </label>
          <label>
            İşletme e-postası
            <input name="email" type="email" required />
          </label>
          <label>
            Yetkili kişi
            <input name="authorizedPerson" required />
          </label>
          <label>
            Sektör
            <input name="sector" />
          </label>
          <button
            className="button button-primary"
            type="button"
            disabled={!hydrated || busy}
            onClick={(event) => {
              if (event.currentTarget.form) void createOrganization(event.currentTarget.form);
            }}
          >
            İşletmeyi oluştur
          </button>
        </form>
      )}
      {stage === "address" && (
        <form
          className="auth-form two-column"
          onSubmit={(event) => handleSubmit(event, createAddress)}
        >
          <label>
            Adres başlığı
            <input name="title" defaultValue="Merkez" required />
          </label>
          <label>
            İlgili kişi
            <input name="contactName" required />
          </label>
          <label>
            Telefon
            <input name="phone" type="tel" required />
          </label>
          <label>
            İl
            <input name="city" required />
          </label>
          <label>
            İlçe
            <input name="district" required />
          </label>
          <label>
            Mahalle
            <input name="neighborhood" />
          </label>
          <label>
            Posta kodu
            <input name="postalCode" />
          </label>
          <label className="span-two">
            Açık adres
            <textarea name="line1" required minLength={5} />
          </label>
          <button
            className="button button-primary"
            type="button"
            disabled={!hydrated || busy}
            onClick={(event) => {
              if (event.currentTarget.form) void createAddress(event.currentTarget.form);
            }}
          >
            Adresi kaydet
          </button>
        </form>
      )}
      {stage === "document" && (
        <form className="auth-form" onSubmit={(event) => handleSubmit(event, uploadDocument)}>
          <label>
            Belge türü
            <select name="type">
              <option value="TAX_CERTIFICATE">Vergi levhası</option>
              <option value="TRADE_REGISTRY">Ticaret sicil gazetesi</option>
              <option value="AUTHORIZED_SIGNATURE">İmza sirküleri</option>
            </select>
          </label>
          <label>
            Özel şirket belgesi
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
          <button
            className="button button-primary"
            type="button"
            disabled={!hydrated || busy}
            onClick={(event) => {
              if (event.currentTarget.form) void uploadDocument(event.currentTarget.form);
            }}
          >
            Belgeyi güvenli yükle
          </button>
        </form>
      )}
      {stage === "review" && (
        <div>
          <h2>Başvuruyu gönderin</h2>
          <p>
            İşletme, merkez adresi ve belge kaydedildi. Gönderdikten sonra bilgiler admin inceleme
            kuyruğuna alınır.
          </p>
          <button
            className="button button-primary"
            disabled={!hydrated || busy}
            onClick={submitApplication}
          >
            Doğrulamaya gönder
          </button>
        </div>
      )}
      {stage === "done" && (
        <div>
          <p className="form-status success" role="status">
            Başvurunuz inceleme kuyruğuna alındı.
          </p>
          <a className="button button-secondary" href="/panel">
            Panele dön
          </a>
        </div>
      )}
    </div>
  );
}
