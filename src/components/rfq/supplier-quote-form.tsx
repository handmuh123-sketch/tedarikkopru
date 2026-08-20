"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  organizationId: string;
  rfqId: string;
};

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function SupplierQuoteForm({ organizationId, rfqId }: Props) {
  const router = useRouter();
  const [unitPriceAmountMinor, setUnitPriceAmountMinor] = useState<number | "">("");
  const [validUntil, setValidUntil] = useState("");
  const [supplierNote, setSupplierNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (typeof unitPriceAmountMinor !== "number" || !validUntil) return;
    setPending(true);
    setMessage("");
    const key = idempotencyKey ?? newIdempotencyKey();
    setIdempotencyKey(key);
    const response = await fetch(`/api/v1/organizations/${organizationId}/rfqs/${rfqId}/quote`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({
        unitPriceAmountMinor,
        validUntil: new Date(`${validUntil}T23:59:59.999+03:00`).toISOString(),
        supplierNote: supplierNote || undefined,
      }),
    });
    const payload = (await response.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Teklif kaydedilemedi.");
      return;
    }
    setMessage("Teklif verildi.");
    router.refresh();
  }

  return (
    <section className="rfq-form-section" aria-labelledby="quote-offer-title">
      <h2 id="quote-offer-title">Fiyat teklifi ver</h2>
      <p>Birim fiyat TRY kuruş olarak kaydedilir.</p>
      <form className="rfq-form" onSubmit={submit}>
        <label>
          Birim fiyat (kuruş)
          <input
            type="number"
            min="1"
            step="1"
            value={unitPriceAmountMinor}
            onChange={(event) =>
              setUnitPriceAmountMinor(
                event.currentTarget.value === "" ? "" : event.currentTarget.valueAsNumber,
              )
            }
            required
          />
        </label>
        <label>
          Teklif geçerlilik tarihi
          <input
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.currentTarget.value)}
            required
          />
        </label>
        <label>
          Tedarikçi notu
          <textarea
            value={supplierNote}
            maxLength={1000}
            onChange={(event) => setSupplierNote(event.currentTarget.value)}
          />
        </label>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Kaydediliyor…" : "Teklif ver"}
        </button>
        {message && <p className="form-status" role="status">{message}</p>}
      </form>
    </section>
  );
}
