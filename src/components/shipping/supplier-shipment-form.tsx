"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type ShipmentState = "ACCEPTED" | "SHIPPED";

function idempotencyKey(currentKey: string, setKey: (key: string) => void): string {
  if (currentKey) return currentKey;
  const nextKey = crypto.randomUUID();
  setKey(nextKey);
  return nextKey;
}

export function SupplierShipmentForm({
  organizationId,
  orderId,
  state,
}: {
  organizationId: string;
  orderId: string;
  state: ShipmentState;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requestKey, setRequestKey] = useState("");

  async function createShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/shipment`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey(requestKey, setRequestKey),
        },
        body: JSON.stringify({
          carrier: formData.get("carrier"),
          trackingNumber: formData.get("trackingNumber"),
          shippedAt: formData.get("shippedAt"),
          estimatedDeliveryAt: formData.get("estimatedDeliveryAt") || undefined,
        }),
      },
    );
    const result = (await response.json()) as {
      data?: { status: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok || !result.data) {
      setMessage(result.error?.message ?? "Kargo bilgileri kaydedilemedi.");
      return;
    }
    setMessage("Sipariş kargoya verildi.");
    router.refresh();
  }

  async function markDelivered() {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/shipment/deliver`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey(requestKey, setRequestKey),
        },
        body: JSON.stringify({}),
      },
    );
    const result = (await response.json()) as {
      data?: { status: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok || !result.data) {
      setMessage(result.error?.message ?? "Teslimat durumu kaydedilemedi.");
      return;
    }
    setMessage("Sipariş teslim edildi olarak işaretlendi.");
    router.refresh();
  }

  if (state === "SHIPPED") {
    return (
      <section className="supplier-order-decision" aria-label="Teslimat durumu">
        <h2>Teslimat durumu</h2>
        <p>Yalnız kargoya verilmiş siparişler teslim edildi olarak işaretlenebilir.</p>
        <button
          className="button button-primary"
          type="button"
          disabled={!hydrated || busy}
          onClick={() => void markDelivered()}
        >
          {busy ? "Kaydediliyor…" : "Teslim edildi olarak işaretle"}
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="supplier-order-decision" aria-label="Kargo bilgileri">
      <h2>Kargoya ver</h2>
      <p>Takip bilgisi manuel girilir; aynı istek tekrarlandığında yeni durum kaydı oluşmaz.</p>
      <form className="catalog-form" onSubmit={(event) => void createShipment(event)}>
        <label>
          Kargo firması
          <input
            name="carrier"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          Takip numarası
          <input name="trackingNumber" required minLength={4} maxLength={120} />
        </label>
        <label>
          Kargoya verilme tarihi
          <input name="shippedAt" type="date" required />
        </label>
        <label>
          Tahmini teslim tarihi
          <input name="estimatedDeliveryAt" type="date" />
        </label>
        <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
          {busy ? "Kaydediliyor…" : "Kargoya ver"}
        </button>
      </form>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
