"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/react/use-hydrated";

export function FavoriteButton({
  productId,
  initial = false,
}: {
  productId: string;
  initial?: boolean;
}) {
  const hydrated = useHydrated();
  const [favorite, setFavorite] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/v1/favorites/products/${productId}`, {
      method: favorite ? "DELETE" : "POST",
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? "Favori işlemi tamamlanamadı.");
      setBusy(false);
      return;
    }
    setFavorite(!favorite);
    setBusy(false);
    setMessage(favorite ? "Favorilerden kaldırıldı." : "Favorilere eklendi.");
  }
  return (
    <div className="favorite-action">
      <button
        className="button button-secondary"
        type="button"
        aria-pressed={favorite}
        onClick={toggle}
        disabled={!hydrated || busy}
      >
        {favorite ? "Favoriden çıkar" : "Favoriye ekle"}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
