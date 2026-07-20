"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentView = {
  id: string;
  status: string;
  amountMinor: number;
  order: { id: string; publicNumber: string; status: string };
};

export function MockPaymentForm({
  organizationId,
  orderId,
  initialPayment,
}: {
  organizationId: string;
  orderId: string;
  initialPayment: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [startKey] = useState(() => crypto.randomUUID());
  const [completionKey] = useState(() => crypto.randomUUID());
  const [payment, setPayment] = useState<PaymentView | null>(
    initialPayment
      ? {
          id: initialPayment.id,
          status: initialPayment.status,
          amountMinor: 0,
          order: { id: orderId, publicNumber: "", status: "PAYMENT_PROCESSING" },
        }
      : null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function startPayment() {
    setPending(true);
    setMessage("");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/payments/mock`,
      { method: "POST", headers: { "idempotency-key": startKey } },
    );
    const payload = (await response.json()) as {
      data?: PaymentView;
      error?: { message?: string };
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Mock ödeme başlatılamadı.");
      return;
    }
    setPayment(payload.data);
    setMessage("Mock ödeme başlatıldı; rezervasyon korunuyor.");
    router.refresh();
  }

  async function complete(outcome: "SUCCEEDED" | "DECLINED" | "CANCELLED") {
    if (!payment) return;
    setPending(true);
    setMessage("");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/payments/complete`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": completionKey },
        body: JSON.stringify({ paymentId: payment.id, outcome }),
      },
    );
    const payload = (await response.json()) as {
      data?: PaymentView;
      error?: { message?: string };
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Mock ödeme tamamlanamadı.");
      return;
    }
    setPayment(payload.data);
    setMessage(
      payload.data.status === "SUCCEEDED"
        ? "Mock ödeme başarılı; sipariş ödendi ve stok kesinleştirildi."
        : "Mock ödeme başarısız veya iptal; stok rezervasyonu serbest bırakıldı.",
    );
    router.refresh();
  }

  const active = payment?.status === "PENDING";
  const terminal =
    payment && ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"].includes(payment.status);
  return (
    <section className="mock-payment" aria-live="polite">
      <h2>Pilot mock ödeme</h2>
      <p className="form-help">
        Kart veya gerçek para kullanılmaz. Başarılı sonuç stoğu düşer; ret, iptal veya zaman aşımı
        rezervasyonu bırakır.
      </p>
      {!payment && (
        <button
          className="button button-primary"
          disabled={pending}
          onClick={() => void startPayment()}
          type="button"
        >
          {pending ? "Başlatılıyor…" : "Mock ödemeyi başlat"}
        </button>
      )}
      {active && (
        <div className="mock-payment-actions">
          <button
            className="button button-primary"
            disabled={pending}
            onClick={() => void complete("SUCCEEDED")}
            type="button"
          >
            Ödemeyi başarılı tamamla
          </button>
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => void complete("DECLINED")}
            type="button"
          >
            Ödemeyi reddet
          </button>
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => void complete("CANCELLED")}
            type="button"
          >
            Ödemeyi iptal et
          </button>
        </div>
      )}
      {terminal && <span className="status-pill">Ödeme: {payment.status}</span>}
      {message && (
        <p
          className={`form-status ${payment?.status === "SUCCEEDED" || active ? "success" : "error"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  );
}
