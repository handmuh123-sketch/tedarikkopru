"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type Decision = "ACCEPTED" | "REJECTED";

export function SupplierOrderDecisionForm({
  organizationId,
  orderId,
}: {
  organizationId: string;
  orderId: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(decision: Decision) {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/supplier-decision`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      },
    );
    const result = (await response.json()) as {
      data?: { status: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok || !result.data) {
      setMessage(result.error?.message ?? "Sipariş kararı kaydedilemedi.");
      return;
    }
    setMessage(result.data.status === "ACCEPTED" ? "Sipariş kabul edildi." : "Sipariş reddedildi.");
    router.refresh();
  }

  return (
    <section className="supplier-order-decision" aria-label="Sipariş kararı">
      <h2>Sipariş kararı</h2>
      <p>Karar verildiğinde aynı karar tekrarlandığında yeni durum kaydı oluşmaz.</p>
      <div className="queue-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={!hydrated || busy}
          onClick={() => void decide("ACCEPTED")}
        >
          {busy ? "Kaydediliyor…" : "Siparişi kabul et"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={!hydrated || busy}
          onClick={() => void decide("REJECTED")}
        >
          Siparişi reddet
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
