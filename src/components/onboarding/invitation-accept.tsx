"use client";
import { useState } from "react";
import { useHydrated } from "@/lib/react/use-hydrated";
export function InvitationAccept({ token }: { token: string }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState("");
  async function accept() {
    const response = await fetch("/api/v1/invitations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body?.error?.message ?? "Davet kabul edilemedi.");
      return;
    }
    window.location.assign("/panel");
  }
  return (
    <div>
      <button className="button button-primary" disabled={!token || !hydrated} onClick={accept}>
        Daveti kabul et
      </button>
      {status && (
        <p className="form-status error" role="alert">
          {status}
        </p>
      )}
    </div>
  );
}
