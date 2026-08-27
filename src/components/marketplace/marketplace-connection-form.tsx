"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/lib/react/use-hydrated";
import { marketplaceProviderByChannel } from "@/modules/marketplace/domain/providers";
import type { MarketplaceChannel } from "@/modules/marketplace/domain/types";

type Connection = { id: string; displayName: string; credentialsConfigured: boolean } | null;

export function MarketplaceConnectionForm({
  organizationId,
  connection,
  channel = "TRENDYOL",
}: {
  organizationId: string;
  connection: Connection;
  channel?: MarketplaceChannel;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const provider = marketplaceProviderByChannel(channel);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData(formElement);
    const apiKey = String(form.get("apiKey") ?? "").trim() || undefined;
    const apiSecretInput = String(form.get("apiSecret") ?? "").trim() || undefined;
    const credentials = {
      sellerId: String(form.get("sellerId") ?? "").trim() || undefined,
      apiKey,
      apiSecret: channel === "CICEKSEPETI" ? apiKey : apiSecretInput,
      webhookApiKey: String(form.get("webhookApiKey") ?? "").trim() || undefined,
      refreshToken: String(form.get("refreshToken") ?? "").trim() || undefined,
      environment: String(form.get("environment") ?? "STAGE"),
    };
    const body = {
      displayName: String(form.get("displayName") ?? provider.name).trim(),
      ...(connection
        ? {
            credentials: Object.values(credentials).some(
              (value) => value !== undefined && value !== "STAGE",
            )
              ? credentials
              : undefined,
          }
        : { channel, credentials }),
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
    setMessage(
      `${provider.name} bağlantısı güvenli biçimde kaydedildi. Secret değerler tekrar gösterilmez.`,
    );
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Bağlantı adı
        <input defaultValue={connection?.displayName ?? provider.name} name="displayName" required />
      </label>
      <label>
        Ortam
        <select defaultValue="STAGE" name="environment">
          <option value="STAGE">{provider.stageLabel}</option>
          <option value="PRODUCTION">{provider.productionLabel}</option>
        </select>
      </label>
      <label>
        {provider.sellerIdLabel}
        <input autoComplete="off" name="sellerId" required={!connection} />
      </label>
      <label>
        {provider.apiKeyLabel}
        <input autoComplete="off" name="apiKey" required={!connection} type="password" />
      </label>
      {channel !== "CICEKSEPETI" ? (
        <label>
          {provider.apiSecretLabel}
          <input autoComplete="new-password" name="apiSecret" required={!connection} type="password" />
        </label>
      ) : (
        <p>ÇiçekSepeti bağlantısı resmi x-api-key değeri ile doğrulanır.</p>
      )}
      {channel === "AMAZON_TR" ? (
        <label>
          LWA Refresh Token
          <input
            autoComplete="new-password"
            name="refreshToken"
            required={!connection}
            type="password"
          />
        </label>
      ) : null}
      {channel === "TRENDYOL" ? (
        <label>
          Webhook API anahtarı
          <input autoComplete="new-password" name="webhookApiKey" type="password" />
        </label>
      ) : null}
      {connection?.credentialsConfigured && (
        <p>Mevcut credential kayıtlıdır; boş alanlar eski secret değerlerini korur.</p>
      )}
      <button className="button button-primary" disabled={!hydrated || busy} type="submit">
        {busy ? "Kaydediliyor…" : connection ? "Bağlantıyı güncelle" : "Bağlantıyı yapılandır"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
