"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type Decision = "ACCEPTED" | "REJECTED";
type ReturnStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "RETURN_RECEIVED";

export function SupplierReturnActionForm({
  organizationId,
  orderId,
  returnId,
  status,
}: {
  organizationId: string;
  orderId: string;
  returnId: string;
  status: ReturnStatus;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [decisionKeys, setDecisionKeys] = useState<Partial<Record<Decision, string>>>({});
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(decision: Decision) {
    setBusy(true);
    setMessage("");
    const key = decisionKeys[decision] ?? crypto.randomUUID();
    setDecisionKeys((current) => ({ ...current, [decision]: key }));
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/returns/${returnId}/decision`,
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
      setMessage(payload.error?.message ?? "İade kararı kaydedilemedi.");
      return;
    }
    setMessage(decision === "ACCEPTED" ? "İade kabul edildi." : "İade reddedildi.");
    router.refresh();
  }

  async function receive() {
    setBusy(true);
    setMessage("");
    const key = receiptKey ?? crypto.randomUUID();
    setReceiptKey(key);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/returns/${returnId}/receive`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({}),
      },
    );
    const payload = (await response.json()) as {
      data?: { status: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "İade teslim alma kaydedilemedi.");
      return;
    }
    setMessage("Geri gelen ürün teslim alındı ve stok güncellendi.");
    router.refresh();
  }

  if (status === "REQUESTED") {
    return (
      <section className="supplier-order-decision" aria-label="İade kararı">
        <h2>İade kararı</h2>
        <p>Kabul kaydı uygulama içi refund oluşturur; stok henüz artırılmaz.</p>
        <div className="queue-actions">
          <button
            className="button button-primary"
            type="button"
            disabled={!hydrated || busy}
            onClick={() => void decide("ACCEPTED")}
          >
            {busy ? "Kaydediliyor…" : "İadeyi kabul et"}
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={!hydrated || busy}
            onClick={() => void decide("REJECTED")}
          >
            İadeyi reddet
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

  if (status === "ACCEPTED") {
    return (
      <section className="supplier-order-decision" aria-label="İade teslim alma">
        <h2>Geri gelen ürünü teslim al</h2>
        <p>Stok yalnız fiziksel iade teslim alındığında bir kez geri eklenir.</p>
        <button
          className="button button-primary"
          type="button"
          disabled={!hydrated || busy}
          onClick={() => void receive()}
        >
          {busy ? "Kaydediliyor…" : "Ürün geri geldi olarak işaretle"}
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </section>
    );
  }

  return null;
}
