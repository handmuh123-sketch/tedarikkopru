"use client";

import { useEffect, useState } from "react";

type Application = {
  id: string;
  status: string;
  submittedAt: string | null;
  organization: { legalName: string; tradeName: string };
  documents: Array<{ id: string; type: string; scanStatus: string }>;
};

export function VerificationQueue({ canOperate }: { canOperate: boolean }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState("Kuyruk yükleniyor…");
  async function load() {
    const response = await fetch("/api/v1/admin/verifications");
    if (!response.ok) {
      setStatus("Kuyruk yüklenemedi.");
      return;
    }
    const body = await response.json();
    setApplications(body.data);
    setStatus("");
  }
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/admin/verifications").then(async (response) => {
      if (cancelled) return;
      if (!response.ok) {
        setStatus("Kuyruk yüklenemedi.");
        return;
      }
      const body = await response.json();
      if (!cancelled) {
        setApplications(body.data);
        setStatus("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  async function transition(id: string, nextStatus: string) {
    const needsReason = ["NEEDS_CHANGES", "REJECTED", "SUSPENDED"].includes(nextStatus);
    const reason = needsReason ? window.prompt("Gerekçeyi yazın (en az 5 karakter):") : undefined;
    if (needsReason && (!reason || reason.length < 5)) return;
    const response = await fetch(`/api/v1/admin/verifications/${id}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reason }),
    });
    if (!response.ok) {
      const body = await response.json();
      setStatus(body?.error?.message ?? "İşlem tamamlanamadı.");
      return;
    }
    await load();
  }
  return (
    <section>
      <p role="status">{status}</p>
      <div className="dashboard-grid">
        {applications.map((application) => (
          <article className="dashboard-card" key={application.id}>
            <span className="status-pill">{application.status}</span>
            <h2>{application.organization.tradeName}</h2>
            <p>{application.organization.legalName}</p>
            <ul>
              {application.documents.map((document) => (
                <li key={document.id}>
                  <a
                    href={`/api/v1/verification-documents/${document.id}/content`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {document.type}
                  </a>{" "}
                  · {document.scanStatus}
                </li>
              ))}
            </ul>
            <div className="queue-actions">
              {canOperate && application.status === "SUBMITTED" && (
                <button
                  className="button button-secondary"
                  onClick={() => transition(application.id, "IN_REVIEW")}
                >
                  İncelemeye al
                </button>
              )}
              {canOperate && application.status === "IN_REVIEW" && (
                <>
                  <button
                    className="button button-primary"
                    onClick={() => transition(application.id, "APPROVED")}
                  >
                    Onayla
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => transition(application.id, "NEEDS_CHANGES")}
                  >
                    Değişiklik iste
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => transition(application.id, "REJECTED")}
                  >
                    Reddet
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
