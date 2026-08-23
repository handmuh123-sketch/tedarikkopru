"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";

type Connection = { id: string; displayName: string; credentialsConfigured: boolean } | null;

export function MarketplaceConnectionForm({
  organizationId,
  connection,
}: {
  organizationId: string;
  connection: Connection;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData(formElement);
    const credentials = {
      sellerId: String(form.get("sellerId") ?? "").trim() || undefined,
      apiKey: String(form.get("apiKey") ?? "").trim() || undefined,
      apiSecret: String(form.get("apiSecret") ?? "").trim() || undefined,
      webhookApiKey: String(form.get("webhookApiKey") ?? "").trim() || undefined,
      environment: String(form.get("environment") ?? "STAGE"),
    };
    const body = {
      displayName: String(form.get("displayName") ?? "Trendyol").trim(),
      ...(connection
        ? {
            credentials: Object.values(credentials).some(
              (value) => value !== undefined && value !== "STAGE",
            )
              ? credentials
              : undefined,
          }
        : { channel: "TRENDYOL", credentials }),
    };
    const url = connection
      ? `/api/v1/organizations/${organizationId}/marketplace-connections/${connection.id}`
      : `/api/v1/organizations/${organizationId}/marketplace-connections`;
    const response = await fetch(url, {
      method: connection ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result?.error?.message ?? "Bağlantı kaydedilemedi.");
      return;
    }
    formElement.reset();
    setMessage("Bağlantı güvenli biçimde kaydedildi. Secret değerler tekrar gösterilmez.");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Bağlantı adı
        <input defaultValue={connection?.displayName ?? "Trendyol"} name="displayName" required />
      </label>
      <label>
        Ortam
        <select defaultValue="STAGE" name="environment">
          <option value="STAGE">Trendyol stage</option>
          <option value="PRODUCTION">Trendyol production</option>
        </select>
      </label>
      <label>
        Satıcı kimliği
        <input autoComplete="off" name="sellerId" required={!connection} />
      </label>
      <label>
        API anahtarı
        <input autoComplete="off" name="apiKey" required={!connection} type="password" />
      </label>
      <label>
        API secret
        <input
          autoComplete="new-password"
          name="apiSecret"
          required={!connection}
          type="password"
        />
      </label>
      <label>
        Webhook API anahtarı
        <input autoComplete="new-password" name="webhookApiKey" type="password" />
      </label>
      {connection?.credentialsConfigured && (
        <p>Mevcut credential kayıtlıdır; boş alanlar eski secret’ı korur.</p>
      )}
      <button className="button button-primary" disabled={!hydrated || busy} type="submit">
        {busy ? "Kaydediliyor…" : connection ? "Bağlantıyı güncelle" : "Bağlantıyı yapılandır"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
