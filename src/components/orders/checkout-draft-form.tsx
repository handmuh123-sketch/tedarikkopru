"use client";

import Link from "next/link";
import { useState } from "react";

type AddressOption = { id: string; title: string; city: string; district: string; type: string };
type CheckoutResult = {
  id: string;
  status: string;
  expiresAt: string;
  totalAmountMinor: number;
  order: { id: string; publicNumber: string; status: string } | null;
};

export function CheckoutDraftForm({
  organizationId,
  deliveryAddresses,
  invoiceAddresses,
}: {
  organizationId: string;
  deliveryAddresses: AddressOption[];
  invoiceAddresses: AddressOption[];
}) {
  const [deliveryAddressId, setDeliveryAddressId] = useState(deliveryAddresses[0]?.id ?? "");
  const [invoiceAddressId, setInvoiceAddressId] = useState(invoiceAddresses[0]?.id ?? "");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/v1/organizations/${organizationId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({ deliveryAddressId, invoiceAddressId }),
    });
    const payload = (await response.json()) as {
      data?: CheckoutResult;
      error?: { message?: string };
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Checkout taslağı oluşturulamadı.");
      return;
    }
    setResult(payload.data);
  }

  async function release() {
    if (!result) return;
    setPending(true);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/checkouts/${result.id}/release`,
      { method: "POST" },
    );
    setPending(false);
    if (response.ok) setResult({ ...result, status: "CANCELLED" });
    else setMessage("Rezervasyon bırakılamadı.");
  }

  if (result) {
    return (
      <section className="checkout-success" aria-live="polite">
        <span className="status-pill">{result.status}</span>
        <h2>Sipariş taslağı hazır</h2>
        <p>
          Sipariş: <strong>{result.order?.publicNumber}</strong>
        </p>
        <p>Rezervasyon bitişi: {new Date(result.expiresAt).toLocaleString("tr-TR")}</p>
        {result.order && (
          <Link className="button button-primary" href={`/panel/siparisler/${result.order.id}`}>
            Sipariş ve ödeme detayına git
          </Link>
        )}
        {result.status === "DRAFT" && (
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => void release()}
            type="button"
          >
            Rezervasyonu bırak
          </button>
        )}
      </section>
    );
  }

  return (
    <form className="auth-form checkout-form" onSubmit={submit}>
      <label>
        Teslimat adresi
        <select
          value={deliveryAddressId}
          onChange={(event) => setDeliveryAddressId(event.currentTarget.value)}
          required
        >
          {deliveryAddresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.title} · {address.district}/{address.city}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fatura adresi
        <select
          value={invoiceAddressId}
          onChange={(event) => setInvoiceAddressId(event.currentTarget.value)}
          required
        >
          {invoiceAddresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.title} · {address.district}/{address.city}
            </option>
          ))}
        </select>
      </label>
      <p className="form-help">
        Checkout, stoğu 15 dakika ayırır ve yalnız sipariş taslağı oluşturur; ödeme alınmaz.
      </p>
      <button
        className="button button-primary"
        disabled={pending || !deliveryAddressId || !invoiceAddressId}
        type="submit"
      >
        {pending ? "Oluşturuluyor…" : "Checkout taslağı oluştur"}
      </button>
      {message && (
        <p className="form-status error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
