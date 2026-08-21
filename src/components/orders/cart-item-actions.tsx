"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  organizationId: string;
  itemId: string;
  initialQuantity: number;
  moq: number;
  quantityStep: number;
};

export function CartItemActions({
  organizationId,
  itemId,
  initialQuantity,
  moq,
  quantityStep,
}: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [pending, setPending] = useState(false);

  async function mutate(method: "PATCH" | "DELETE") {
    setPending(true);
    setStatus(null);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/cart/items/${itemId}`,
      method === "PATCH"
        ? {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ quantity }),
          }
        : { method },
    );
    const payload = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    if (!response.ok) {
      setStatus({ ok: false, message: payload.error?.message ?? "Sepet güncellenemedi." });
      return;
    }
    if (method === "PATCH") {
      setStatus({ ok: true, message: "Sepet miktarı güncellendi." });
    }
    router.refresh();
  }

  return (
    <div className="cart-item-actions">
      <label>
        Miktar
        <input
          type="number"
          min={moq}
          step={quantityStep}
          value={quantity}
          onChange={(event) => setQuantity(event.currentTarget.valueAsNumber)}
        />
      </label>
      <button
        className="button button-secondary"
        disabled={pending}
        onClick={() => void mutate("PATCH")}
        type="button"
      >
        Güncelle
      </button>
      <button
        className="button button-secondary"
        disabled={pending}
        onClick={() => void mutate("DELETE")}
        type="button"
      >
        Sil
      </button>
      {status && (
        <p
          className={`form-status ${status.ok ? "success" : "error"}`}
          role={status.ok ? "status" : "alert"}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
