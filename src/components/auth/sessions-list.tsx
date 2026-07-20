"use client";

import { useEffect, useState } from "react";

type SessionItem = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
};

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [status, setStatus] = useState("Oturumlar yükleniyor…");
  async function load() {
    const response = await fetch("/api/auth/list-sessions");
    if (!response.ok) {
      setStatus("Oturumlar yüklenemedi.");
      return;
    }
    const data = await response.json();
    setSessions(data);
    setStatus("");
  }
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/list-sessions").then(async (response) => {
      if (cancelled) return;
      if (!response.ok) {
        setStatus("Oturumlar yüklenemedi.");
        return;
      }
      const data = await response.json();
      if (!cancelled) {
        setSessions(data);
        setStatus("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  async function revoke(token: string) {
    const response = await fetch("/api/auth/revoke-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.ok) await load();
    else setStatus("Oturum kapatılamadı.");
  }
  return (
    <div>
      {status && <p role="status">{status}</p>}
      <ul className="session-list">
        {sessions.map((session) => (
          <li key={session.id}>
            <div>
              <strong>{session.userAgent || "Bilinmeyen cihaz"}</strong>
              <span>Son geçerlilik: {new Date(session.expiresAt).toLocaleString("tr-TR")}</span>
            </div>
            <button className="button button-secondary" onClick={() => revoke(session.token)}>
              Oturumu kapat
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
