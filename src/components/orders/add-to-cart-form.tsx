"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  organizationId: string;
  variantId: string;
  moq: number;
  quantityStep: number;
  supplierConflict: boolean;
};

export function AddToCartForm({
  organizationId,
  variantId,
  moq,
  quantityStep,
  supplierConflict,
}: Props) {
  const [quantity, setQuantity] = useState(moq);
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const response = await fetch(`/api/v1/organizations/${organizationId}/cart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variantId, quantity }),
    });
    const payload = (await response.json()) as { error?: { message?: string } };
    setPending(false);
    setStatus({
      ok: response.ok,
      message: response.ok
        ? "Ürün sepete eklendi."
        : (payload.error?.message ?? "Ürün eklenemedi."),
    });
  }

  return (
    <form className="cart-add-form" onSubmit={submit}>
      <label>
        Miktar
        <input
          aria-describedby="cart-quantity-help"
          type="number"
          min={moq}
          step={quantityStep}
          value={quantity}
          onChange={(event) => setQuantity(event.currentTarget.valueAsNumber)}
          required
        />
      </label>
      <small id="cart-quantity-help">
        En az {moq}; {quantityStep} adetlik adımlarla.
      </small>
      <button
        className="button button-primary"
        disabled={pending || supplierConflict}
        type="submit"
      >
        {pending ? "Ekleniyor…" : "Sepete ekle"}
      </button>
      {supplierConflict && (
        <p className="form-status error" role="alert">
          Sepetinizde başka bir tedarikçinin ürünü var. Önce sepeti boşaltın.
        </p>
      )}
      {status && (
        <p className={`form-status ${status.ok ? "success" : "error"}`} role="status">
          {status.message} {status.ok && <Link href="/panel/sepet">Sepete git</Link>}
        </p>
      )}
    </form>
  );
}
