"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lib/react/use-hydrated";

export function ProductSubmitButton({
  organizationId,
  productId,
}: {
  organizationId: string;
  productId: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true);
    const response = await fetch(
      `/api/v1/organizations/${organizationId}/products/${productId}/submit`,
      { method: "POST" },
    );
    const result = await response.json();
    if (!response.ok) {
      setBusy(false);
      return setMessage(result?.error?.message ?? "Gönderilemedi.");
    }
    setMessage("Ürün moderasyona gönderildi.");
    router.refresh();
  }
  return (
    <>
      <button
        className="button button-primary"
        type="button"
        onClick={submit}
        disabled={!hydrated || busy}
      >
        {busy ? "Gönderiliyor…" : "Onaya gönder"}
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}

export function ProductModerationActions({ productId }: { productId: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function moderate(status: "ACTIVE" | "REJECTED") {
    const note =
      status === "REJECTED"
        ? window.prompt("Ret gerekçesini yazın (en az 5 karakter):")
        : undefined;
    if (status === "REJECTED" && (!note || note.length < 5)) return;
    setBusy(true);
    const response = await fetch(`/api/v1/admin/products/${productId}/moderate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const result = await response.json();
    if (!response.ok) {
      setBusy(false);
      return setMessage(result?.error?.message ?? "Moderasyon tamamlanamadı.");
    }
    setMessage(status === "ACTIVE" ? "Ürün yayına alındı." : "Ürün reddedildi.");
    router.refresh();
  }
  return (
    <div>
      <div className="queue-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => moderate("ACTIVE")}
          disabled={!hydrated || busy}
        >
          Onayla ve yayınla
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => moderate("REJECTED")}
          disabled={!hydrated || busy}
        >
          Reddet
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
