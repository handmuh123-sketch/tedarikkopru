import Link from "next/link";

import {
  MarketplaceConnectionTestButton,
  MarketplacePublishButton,
} from "@/components/marketplace/marketplace-actions";
import { MarketplaceConnectionForm } from "@/components/marketplace/marketplace-connection-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { serverEnvironment } from "@/lib/env/server";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";
import { evaluateTrendyolLiveReadiness } from "@/modules/marketplace/application/trendyol-readiness";

export const dynamic = "force-dynamic";

const managerRoles = new Set(["OWNER", "ORG_ADMIN"]);

function verificationLabel(status: string): string {
  if (status === "APPROVED") return "Onaylandı";
  if (["SUBMITTED", "IN_REVIEW"].includes(status)) return "İncelemede";
  return "Başvuruyu tamamla";
}

export default async function MarketplaceIntegrationsPage() {
  const { user } = await requirePageUser();
  const [memberships, preview] = await Promise.all([
    database.organizationMembership.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
        organization: { type: { in: ["RESELLER", "BOTH"] }, status: { not: "ARCHIVED" } },
      },
      include: {
        organization: {
          include: { marketplaceConnections: { where: { channel: "TRENDYOL" }, take: 1 } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    buildTrendyolPreview(user.id),
  ]);
  const readiness = await Promise.all(
    memberships
      .filter(
        ({ organization }) =>
          organization.status === "ACTIVE" && organization.verificationStatus === "APPROVED",
      )
      .map(
        async ({ organization }) =>
          [organization.id, await evaluateTrendyolLiveReadiness(user.id, organization.id)] as const,
      ),
  );
  const readinessByOrganization = new Map(readiness);

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Pazaryeri pilotu</p>
          <h1>Pazaryeri entegrasyonları</h1>
        </div>
        <Link className="button button-secondary" href="/panel/favoriler">
          Favorilere dön
        </Link>
      </header>
      <section className="dashboard-card" aria-labelledby="trendyol-preview-title">
        <h2 id="trendyol-preview-title">Trendyol önizleme</h2>
        <p>
          Seçili varyant {preview.products.length} · Hazır {preview.validation.validCount} · Hatalı{" "}
          {preview.validation.invalidCount}
        </p>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/panel/entegrasyonlar/trendyol/onizleme">
            Kartlı önizlemeyi aç
          </Link>
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/export">
            Trendyol JSON indir
          </Link>
        </div>
      </section>
      {memberships.length === 0 ? (
        <section className="dashboard-card">
          <h2>Alıcı işletmeniz yok</h2>
          <p>
            Trendyol bağlantısı için önce bir alıcı işletmesi oluşturup doğrulama başvurusu yapın.
          </p>
          <Link className="button button-primary" href="/onboarding">
            Alıcı işletmesi oluştur
          </Link>
        </section>
      ) : null}
      {memberships.map(({ organization, role }) => {
        const connection = organization.marketplaceConnections[0] ?? null;
        const canManage = managerRoles.has(role);
        const approved =
          organization.status === "ACTIVE" && organization.verificationStatus === "APPROVED";
        const organizationReadiness = readinessByOrganization.get(organization.id);
        return (
          <section className="dashboard-card" key={organization.id}>
            <h2>Trendyol · {organization.tradeName}</h2>
            <p>
              İşletme doğrulaması:{" "}
              <strong>{verificationLabel(organization.verificationStatus)}</strong>
            </p>
            {!approved ? (
              <>
                <p>
                  Bağlantı ve canlı aktarım, platform onayı sonrasında açılır. İşletme sahibi kendi
                  başvurusunu onaylayamaz.
                </p>
                {organization.verificationStatus === "DRAFT" ||
                organization.verificationStatus === "NEEDS_CHANGES" ? (
                  <Link className="button button-primary" href="/onboarding">
                    Başvuruyu tamamla
                  </Link>
                ) : (
                  <span className="status-pill">İncelemede</span>
                )}
              </>
            ) : (
              <>
                <p>Durum: {connection?.status ?? "Bağlı değil"}</p>
                <p>Credential: {connection?.credentialCiphertext ? "Yapılandırıldı" : "Yok"}</p>
                <p>
                  Canlı readiness:{" "}
                  <strong>{organizationReadiness?.state === "READY" ? "Hazır" : "Bloklu"}</strong>
                </p>
                {organizationReadiness?.reasons.map((reason) => (
                  <p key={reason.code}>{reason.message}</p>
                ))}
                {connection?.lastErrorCode && <p>Son güvenli hata: {connection.lastErrorCode}</p>}
                {canManage ? (
                  <div className="dashboard-grid">
                    <MarketplaceConnectionForm
                      connection={
                        connection
                          ? {
                              id: connection.id,
                              displayName: connection.displayName,
                              credentialsConfigured: Boolean(connection.credentialCiphertext),
                            }
                          : null
                      }
                      organizationId={organization.id}
                    />
                    {connection && (
                      <div>
                        <MarketplaceConnectionTestButton
                          connectionId={connection.id}
                          organizationId={organization.id}
                        />
                        <MarketplacePublishButton
                          connectionId={connection.id}
                          liveEnabled={
                            serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL &&
                            organizationReadiness?.state === "READY"
                          }
                          organizationId={organization.id}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p>
                    Bağlantı credential’larını yalnız işletme sahibi veya işletme yöneticisi
                    değiştirebilir.
                  </p>
                )}
              </>
            )}
          </section>
        );
      })}
    </main>
  );
}
