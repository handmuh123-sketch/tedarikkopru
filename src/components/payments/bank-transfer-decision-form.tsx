"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BankTransferDecisionForm({
  paymentId,
  status,
  canDecide,
}: {
  paymentId: string;
  status: string;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [key] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(decision: "APPROVE" | "REJECT") {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/v1/admin/payments/${paymentId}/bank-transfer-decision`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ decision }),
    });
    const payload = (await response.json()) as {
      data?: { status: string };
      error?: { message?: string };
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Ödeme kararı kaydedilemedi.");
      return;
    }
    setMessage(decision === "APPROVE" ? "Transfer onaylandı." : "Transfer reddedildi.");
    router.refresh();
  }

  if (status !== "PENDING") return <span className="status-pill">{status}</span>;
  if (!canDecide)
    return <p className="form-help">Bu ödeme için yalnız görüntüleme yetkiniz var.</p>;
  return (
    <section className="supplier-order-decision" aria-label="Banka transferi kararı">
      <h2>Ödeme kararı</h2>
      <div className="queue-actions">
        <button
          className="button button-primary"
          disabled={pending}
          onClick={() => void decide("APPROVE")}
          type="button"
        >
          {pending ? "Kaydediliyor…" : "Transferi onayla"}
        </button>
        <button
          className="button button-secondary"
          disabled={pending}
          onClick={() => void decide("REJECT")}
          type="button"
        >
          Transferi reddet
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
