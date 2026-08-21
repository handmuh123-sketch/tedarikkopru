"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BankTransferPaymentForm({
  organizationId,
  orderId,
  accountName,
  iban,
  initialPayment,
}: {
  organizationId: string;
  orderId: string;
  accountName: string;
  iban: string;
  initialPayment: { id: string; status: string; bankTransferReference: string | null } | null;
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState(initialPayment);

  async function start() {
    setPending(true);
    setMessage("");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/payments/bank-transfer`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body: JSON.stringify(note ? { note } : {}),
      },
    );
    const payload = (await response.json()) as {
      data?: { id: string; status: string; bankTransferReference: string | null };
      error?: { message?: string };
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Banka transferi başlatılamadı.");
      return;
    }
    setPayment(payload.data);
    setMessage("Transfer bildirimi alındı; operasyon onayı bekleniyor.");
    router.refresh();
  }

  return (
    <section className="mock-payment" aria-live="polite">
      <h2>Manuel banka transferi</h2>
      <p className="form-help">Alıcı: {accountName}</p>
      <p className="form-help">IBAN: {iban}</p>
      {payment ? (
        <>
          <p className="form-help">Ödeme referansı: <strong>{payment.bankTransferReference}</strong></p>
          <span className="status-pill">Ödeme: {payment.status}</span>
        </>
      ) : (
        <>
          <label htmlFor="bank-transfer-note">Transfer notu (isteğe bağlı)</label>
          <textarea
            id="bank-transfer-note"
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.currentTarget.value)}
          />
          <button className="button button-primary" disabled={pending} onClick={() => void start()} type="button">
            {pending ? "Kaydediliyor…" : "Banka transferi bildirimi oluştur"}
          </button>
        </>
      )}
      {message && <p className="form-status success" role="status">{message}</p>}
    </section>
  );
}
