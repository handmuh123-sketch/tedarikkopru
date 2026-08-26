"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type ReturnableItem = {
  id: string;
  productTitleSnapshot: string;
  variantTitleSnapshot: string;
  skuSnapshot: string;
  quantity: number;
};

const returnReasons = [
  ["DAMAGED", "Hasarlı"],
  ["DEFECTIVE", "Arızalı"],
  ["WRONG_ITEM", "Yanlış ürün"],
  ["NOT_AS_DESCRIBED", "Açıklamaya uymuyor"],
  ["OTHER", "Diğer"],
] as const;

export function BuyerReturnRequestForm({
  organizationId,
  orderId,
  items,
}: {
  organizationId: string;
  orderId: string;
  items: ReturnableItem[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [reason, setReason] = useState<(typeof returnReasons)[number][0]>("DAMAGED");
  const [buyerNote, setBuyerNote] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const returnItems = items
      .map((item) => ({ orderItemId: item.id, quantity: quantities[item.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    if (returnItems.length === 0) {
      setMessage("İade için en az bir ürün satırı ve miktar seçin.");
      return;
    }
    setBusy(true);
    setMessage("");
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/orders/${orderId}/returns`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({ reason, buyerNote: buyerNote || undefined, items: returnItems }),
      },
    );
    const payload = (await response.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "İade talebi oluşturulamadı.");
      return;
    }
    setMessage("İade talebiniz oluşturuldu.");
    router.refresh();
  }

  return (
    <section className="supplier-order-decision" aria-labelledby="return-request-title">
      <h2 id="return-request-title">İade talebi oluştur</h2>
      <p>Yalnız teslim edilmiş sipariş satırları için tam veya kısmi iade talebi açılabilir.</p>
      <form className="catalog-form" onSubmit={(event) => void submit(event)}>
        <label>
          İade nedeni
          <select
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value as typeof reason)}
          >
            {returnReasons.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="return-buyer-note">Açıklama</label>
        <textarea
          id="return-buyer-note"
          value={buyerNote}
          maxLength={1000}
          onChange={(event) => setBuyerNote(event.currentTarget.value)}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>SKU</th>
                <th>Sipariş adedi</th>
                <th>İade adedi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productTitleSnapshot} · {item.variantTitleSnapshot}
                  </td>
                  <td>{item.skuSnapshot}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <label>
                      <span className="sr-only">{`İade miktarı ${item.skuSnapshot}`}</span>
                      <input
                        aria-label={`İade miktarı ${item.skuSnapshot}`}
                        type="number"
                        min={0}
                        max={item.quantity}
                        step={1}
                        value={quantities[item.id] ?? 0}
                        onChange={(event) => {
                          const quantity = event.currentTarget.valueAsNumber || 0;
                          setQuantities((current) => ({
                            ...current,
                            [item.id]: quantity,
                          }));
                        }}
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
          {busy ? "Kaydediliyor…" : "İade talebi oluştur"}
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
