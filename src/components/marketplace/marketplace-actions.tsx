"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

export function MarketplaceConnectionTestButton({
  organizationId,
  connectionId,
  providerName = "Pazaryeri",
}: {
  organizationId: string;
  connectionId: string;
  providerName?: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function testConnection() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/test`,
        { method: "POST", signal: AbortSignal.timeout(30_000) },
      );
      const result = await response.json().catch(() => null);
      setMessage(
        response.ok
          ? result?.data?.mode === "PREVIEW"
            ? `${providerName} hazırlık bağlantısı doğrulandı; canlı sağlayıcı çağrısı yapılmadı.`
            : `${providerName} canlı bağlantısı doğrulandı.`
          : (result?.error?.message ?? "Bağlantı testi tamamlanamadı."),
      );
      if (response.ok) router.refresh();
    } catch {
      setMessage("Bağlantı testi zamanında tamamlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="button button-secondary"
        disabled={!hydrated || busy}
        onClick={() => void testConnection()}
        type="button"
      >
        {busy ? "Test ediliyor…" : "Bağlantıyı test et"}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export function MarketplacePublishButton({
  organizationId,
  connectionId,
  liveEnabled,
  providerName = "Pazaryeri",
}: {
  organizationId: string;
  connectionId: string;
  liveEnabled: boolean;
  providerName?: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function publish() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/publish-favorites`,
        { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } },
      );
      const result = await response.json().catch(() => null);
      setMessage(
        response.ok
          ? `Yayın işi durumu: ${result?.data?.job?.status ?? "BİLİNMİYOR"}`
          : (result?.error?.message ?? "Yayın isteği tamamlanamadı."),
      );
      if (response.ok) router.refresh();
    } catch {
      setMessage("Yayın isteği tamamlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="button button-primary"
        disabled={!hydrated || busy || !liveEnabled}
        onClick={() => void publish()}
        type="button"
      >
        {busy ? "Gönderiliyor…" : `${providerName}’a aktar`}
      </button>
      {!liveEnabled && <p>Canlı bağlantı henüz etkin değil. Gerçek gönderim yapılmaz.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
