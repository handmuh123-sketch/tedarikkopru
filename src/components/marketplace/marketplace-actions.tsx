"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

export function MarketplaceConnectionTestButton({
  organizationId,
  connectionId,
}: {
  organizationId: string;
  connectionId: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function testConnection() {
    setBusy(true);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/test`,
      { method: "POST" },
    );
    const result = await response.json();
    setBusy(false);
    setMessage(
      response.ok
        ? result.data.mode === "PREVIEW"
          ? "Test modu doğrulandı; gerçek Trendyol çağrısı yapılmadı."
          : "Canlı bağlantı doğrulandı."
        : (result?.error?.message ?? "Bağlantı testi tamamlanamadı."),
    );
    if (response.ok) router.refresh();
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
}: {
  organizationId: string;
  connectionId: string;
  liveEnabled: boolean;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function publish() {
    setBusy(true);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/marketplace-connections/${connectionId}/publish-favorites`,
      { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } },
    );
    const result = await response.json();
    setBusy(false);
    setMessage(
      response.ok
        ? `Yayın işi durumu: ${result.data.job.status}`
        : (result?.error?.message ?? "Yayın isteği tamamlanamadı."),
    );
    if (response.ok) router.refresh();
  }
  return (
    <div>
      <button
        className="button button-primary"
        disabled={!hydrated || busy || !liveEnabled}
        onClick={() => void publish()}
        type="button"
      >
        {busy ? "Gönderiliyor…" : "Trendyol’a aktar"}
      </button>
      {!liveEnabled && (
        <p>Canlı bağlantı henüz etkin değil. Test modu — gerçek gönderim yapılmaz.</p>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
