"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Decision = "ACCEPTED" | "REJECTED";

export function BuyerQuoteDecisionForm({
  organizationId,
  rfqId,
  quoteId,
}: {
  organizationId: string;
  rfqId: string;
  quoteId: string;
}) {
  const router = useRouter();
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(decision: Decision) {
    setBusy(true);
    setMessage("");
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/rfqs/${rfqId}/quotes/${quoteId}/decision`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({ decision }),
      },
    );
    const payload = (await response.json()) as {
      data?: { status: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Teklif kararı kaydedilemedi.");
      return;
    }
    setMessage(payload.data.status === "ACCEPTED" ? "Teklif kabul edildi." : "Teklif reddedildi.");
    router.refresh();
  }

  return (
    <section className="supplier-order-decision" aria-label="Teklif kararı">
      <h2>Teklif kararı</h2>
      <p>Aynı istek tekrarlandığında yeni durum kaydı oluşmaz.</p>
      <div className="queue-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={busy}
          onClick={() => void decide("ACCEPTED")}
        >
          {busy ? "Kaydediliyor…" : "Teklifi kabul et"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={busy}
          onClick={() => void decide("REJECTED")}
        >
          Teklifi reddet
        </button>
      </div>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
