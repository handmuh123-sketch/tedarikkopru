import Link from "next/link";

import {
  MarketplaceConnectionTestButton,
  MarketplacePublishButton,
} from "@/components/marketplace/marketplace-actions";
import { MarketplaceConnectionForm } from "@/components/marketplace/marketplace-connection-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
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

function connectionStatus(
  approved: boolean,
  connection: { status: string; credentialCiphertext: string | null } | null,
  readiness: { state: string } | undefined,
): { label: string; tone: StatusBadgeTone } {
  if (!approved) return { label: "Kurulum gerekli", tone: "missing" };
  if (connection?.status === "ERROR") return { label: "Kontrol gerekli", tone: "error" };
  if (readiness?.state === "READY") return { label: "Hazır", tone: "ready" };
  if (connection?.credentialCiphertext) return { label: "Test modu", tone: "test" };
  return { label: "Kurulum gerekli", tone: "missing" };
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
      <Breadcrumbs items={[{ label: "Panel", href: "/panel" }, { label: "Pazaryeri" }]} />
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Pazaryeri pilotu</p>
          <h1>Trendyol bağlantınız</h1>
          <p>
            Favori ürünlerinizi satışa hazırlayın. Canlıya geçiş yalnız onaylı işletmeler içindir.
          </p>
        </div>
      </header>
      {memberships.length === 0 ? (
        <section className="empty-state" aria-labelledby="marketplace-empty-title">
          <h2 id="marketplace-empty-title">Önce alıcı işletmenizi hazırlayın</h2>
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
          <section className="dashboard-card integration-card" key={organization.id}>
            <div className="card-heading-row">
              <div>
                <p className="eyebrow">Trendyol · {organization.tradeName}</p>
                <h2>Satışa hazırlık</h2>
              </div>
              <StatusBadge {...connectionStatus(approved, connection, organizationReadiness)} />
            </div>
            <p>İşletme doğrulaması: {verificationLabel(organization.verificationStatus)}.</p>
            {!approved ? (
              <>
                <p>
                  Bağlantı ve canlı aktarım, platform onayı sonrasında açılır. İşletme sahibi kendi
                  başvurusunu onaylayamaz.
                </p>
                {(organization.verificationStatus === "DRAFT" ||
                  organization.verificationStatus === "NEEDS_CHANGES") &&
                canManage ? (
                  <Link
                    className="button button-primary"
                    href={`/onboarding?organizationId=${organization.id}`}
                  >
                    Başvuruyu tamamla
                  </Link>
                ) : (
                  <StatusBadge label="İncelemede" tone="review" />
                )}
              </>
            ) : (
              <>
                {organizationReadiness?.state === "READY" ? (
                  <p>Ürün önizlemenizi kontrol edip bağlantıyı test edebilirsiniz.</p>
                ) : (
                  <p>Canlıya geçmek için aşağıdaki eksikleri tamamlayın.</p>
                )}
                {organizationReadiness?.reasons.map((reason) => (
                  <p key={reason.code}>{reason.message}</p>
                ))}
                {canManage ? (
                  <details className="integration-setup">
                    <summary>Trendyol’u hazırla</summary>
                    <div className="integration-setup-content">
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
                      {connection ? (
                        <div className="integration-actions">
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
                      ) : null}
                    </div>
                  </details>
                ) : (
                  <p>
                    Bağlantı credential’larını yalnız işletme sahibi veya işletme yöneticisi
                    değiştirebilir.
                  </p>
                )}
                <div className="dashboard-actions integration-card-actions">
                  <Link
                    className="button button-primary"
                    href="/panel/entegrasyonlar/trendyol/onizleme"
                  >
                    Ürün önizlemesini aç
                  </Link>
                  <Link
                    className="button button-secondary"
                    href="/api/v1/marketplace/trendyol/export"
                  >
                    JSON indir
                  </Link>
                </div>
              </>
            )}
          </section>
        );
      })}
      <section
        className="dashboard-card integration-preview-summary"
        aria-labelledby="trendyol-preview-title"
      >
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">Katalog kontrolü</p>
            <h2 id="trendyol-preview-title">Ürün önizlemesi</h2>
          </div>
          <StatusBadge
            label={preview.validation.invalidCount === 0 ? "Hazır" : "Kontrol gerekli"}
            tone={preview.validation.invalidCount === 0 ? "ready" : "missing"}
          />
        </div>
        <p>
          Seçili varyant {preview.products.length} · Hazır {preview.validation.validCount} · Eksik{" "}
          {preview.validation.invalidCount}
        </p>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/panel/entegrasyonlar/trendyol/onizleme">
            Önizlemeyi aç
          </Link>
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/export">
            JSON indir
          </Link>
        </div>
      </section>
    </main>
  );
}
