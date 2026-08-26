"use client";

import Link from "next/link";
import { useState } from "react";

export function QuoteToCartForm({
  organizationId,
  rfqId,
  quoteId,
}: {
  organizationId: string;
  rfqId: string;
  quoteId: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<null | { ok: boolean; text: string }>(null);

  async function addToCart() {
    setPending(true);
    setMessage(null);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/rfqs/${rfqId}/quotes/${quoteId}/cart`,
      { method: "POST" },
    );
    const payload = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    setMessage({
      ok: response.ok,
      text: response.ok
        ? "Teklifli ürün sepete eklendi."
        : (payload.error?.message ?? "Teklif sepete eklenemedi."),
    });
  }

  return (
    <div className="form-actions">
      <button
        className="button button-primary"
        disabled={pending}
        onClick={() => void addToCart()}
        type="button"
      >
        {pending ? "Sepete ekleniyor…" : "Teklifi sepete ekle"}
      </button>
      {message && (
        <p className={`form-status ${message.ok ? "success" : "error"}`} role="status">
          {message.text} {message.ok && <Link href="/panel/sepet">Sepete git</Link>}
        </p>
      )}
    </div>
  );
}
