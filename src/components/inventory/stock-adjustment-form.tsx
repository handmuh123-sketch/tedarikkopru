"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lib/react/use-hydrated";

export function StockAdjustmentForm({
  organizationId,
  variantId,
  onHand,
  safetyStock,
  version,
}: {
  organizationId: string;
  variantId: string;
  onHand: number;
  safetyStock: number;
  version: number;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/organizations/${organizationId}/inventory/${variantId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        onHand: Number(form.get("onHand")),
        safetyStock: Number(form.get("safetyStock")),
        version,
        reason: form.get("reason"),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? "Stok güncellenemedi.");
      setBusy(false);
      return;
    }
    setMessage("Stok sunucuda güncellendi.");
    setBusy(false);
    router.refresh();
  }

  return (
    <form className="stock-form" onSubmit={submit}>
      <label>
        Stok miktarı
        <input name="onHand" type="number" min="0" required defaultValue={onHand} />
      </label>
      <label>
        Güvenlik stoğu
        <input name="safetyStock" type="number" min="0" required defaultValue={safetyStock} />
      </label>
      <label className="stock-reason">
        Değişiklik nedeni
        <input
          name="reason"
          minLength={3}
          maxLength={240}
          required
          placeholder="Sayım düzeltmesi"
        />
      </label>
      <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
        {busy ? "Güncelleniyor…" : "Stoku güncelle"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
