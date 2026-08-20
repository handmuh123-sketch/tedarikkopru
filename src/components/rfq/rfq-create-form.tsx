"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  organizationId: string;
  variantId: string;
  moq: number;
  quantityStep: number;
};

export function RfqCreateForm({ organizationId, variantId, moq, quantityStep }: Props) {
  const [targetQuantity, setTargetQuantity] = useState(moq);
  const [buyerNote, setBuyerNote] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<null | { id?: string; message: string; ok: boolean }>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const response = await fetch(`/api/v1/organizations/${organizationId}/rfqs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variantId, targetQuantity, buyerNote: buyerNote || undefined }),
    });
    const payload = (await response.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    setPending(false);
    setResult(
      response.ok && payload.data
        ? { id: payload.data.id, ok: true, message: "Teklif talebiniz oluşturuldu." }
        : { ok: false, message: payload.error?.message ?? "Teklif talebi oluşturulamadı." },
    );
  }

  return (
    <section className="rfq-form-section" aria-labelledby="rfq-create-title">
      <h2 id="rfq-create-title">Teklif talep et</h2>
      <p>Hedef tedarikçi bu ürünün mevcut tedarikçisidir.</p>
      <form className="rfq-form" onSubmit={submit}>
        <label>
          Talep miktarı
          <input
            aria-describedby="rfq-quantity-help"
            type="number"
            min={moq}
            step={quantityStep}
            value={targetQuantity}
            onChange={(event) => setTargetQuantity(event.currentTarget.valueAsNumber)}
            required
          />
        </label>
        <small id="rfq-quantity-help">
          En az {moq}; {quantityStep} adetlik adımlarla.
        </small>
        <label>
          Alıcı notu
          <textarea
            value={buyerNote}
            maxLength={1000}
            onChange={(event) => setBuyerNote(event.currentTarget.value)}
          />
        </label>
        <button className="button button-secondary" disabled={pending} type="submit">
          {pending ? "Oluşturuluyor…" : "Teklif talebi oluştur"}
        </button>
        {result && (
          <p className={`form-status ${result.ok ? "success" : "error"}`} role="status">
            {result.message}{" "}
            {result.ok && result.id ? (
              <Link href={`/panel/teklif-talepleri/${result.id}`}>Talep detayını aç</Link>
            ) : null}
          </p>
        )}
      </form>
    </section>
  );
}
