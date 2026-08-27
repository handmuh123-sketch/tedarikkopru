import Link from "next/link";

import {
  MarketplaceConnectionTestButton,
  MarketplacePublishButton,
} from "@/components/marketplace/marketplace-actions";
import { MarketplaceConnectionForm } from "@/components/marketplace/marketplace-connection-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { serverEnvironment } from "@/lib/env/server";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";
import { evaluateTrendyolLiveReadiness } from "@/modules/marketplace/application/trendyol-readiness";

export const dynamic = "force-dynamic";

const managerRoles = new Set(["OWNER", "ORG_ADMIN"]);

export default async function TrendyolIntegrationPage() {
  const { user } = await requirePageUser();
  const [membership, preview] = await Promise.all([
    database.organizationMembership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        organization: {
          type: { in: ["RESELLER", "BOTH"] },
          status: { not: "ARCHIVED" },
        },
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

  if (!membership) {
    return (
      <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
        <Breadcrumbs
          items={[
            { label: "Panel", href: "/panel" },
            { label: "Pazaryeri", href: "/panel/entegrasyonlar" },
            { label: "Trendyol" },
          ]}
        />
        <section className="empty-state">
          <h1>Trendyol için önce alıcı işletmesi oluşturun</h1>
          <Link className="button button-primary" href="/onboarding">
            İşletme oluştur
          </Link>
        </section>
      </main>
    );
  }

  const { organization, role } = membership;
  const connection = organization.marketplaceConnections[0] ?? null;
  const approved =
    organization.status === "ACTIVE" && organization.verificationStatus === "APPROVED";
  const canManage = managerRoles.has(role);
  const readiness = approved
    ? await evaluateTrendyolLiveReadiness(user.id, organization.id)
    : undefined;

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <Breadcrumbs
        items={[
          { label: "Panel", href: "/panel" },
          { label: "Pazaryeri", href: "/panel/entegrasyonlar" },
          { label: "Trendyol" },
        ]}
      />
      <header className="dashboard-header marketplace-channel-header">
        <div>
          <p className="eyebrow">Trendyol entegrasyonu</p>
          <h1>Trendyol mağazanızı yönetin</h1>
          <p>Kategori, marka ve özellik eşlemelerini kontrol edin; bağlantıyı test edip canlı yayına hazırlanın.</p>
        </div>
        <StatusBadge
          label={readiness?.state === "READY" ? "Canlıya hazır" : "Hazırlık"}
          tone={readiness?.state === "READY" ? "ready" : "test"}
        />
      </header>

      <section className="dashboard-card marketplace-channel-card">
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">{organization.tradeName}</p>
            <h2>Trendyol API bağlantısı</h2>
          </div>
          <StatusBadge
            label={connection?.credentialCiphertext ? "Kimlik bilgileri kayıtlı" : "Kurulum gerekli"}
            tone={connection?.credentialCiphertext ? "test" : "missing"}
          />
        </div>
        {!approved ? (
          <p>Bağlantı ayarları işletme doğrulaması tamamlandıktan sonra açılır.</p>
        ) : canManage ? (
          <>
            <MarketplaceConnectionForm
              channel="TRENDYOL"
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
                    serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL && readiness?.state === "READY"
                  }
                  organizationId={organization.id}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p>Bağlantı kimlik bilgilerini yalnız işletme sahibi veya işletme yöneticisi değiştirebilir.</p>
        )}
      </section>

      <section className="dashboard-card marketplace-channel-card">
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">Ürün hazırlığı</p>
            <h2>Trendyol önizlemesi</h2>
          </div>
          <StatusBadge
            label={preview.validation.invalidCount === 0 ? "Hazır" : "Kontrol gerekli"}
            tone={preview.validation.invalidCount === 0 ? "ready" : "missing"}
          />
        </div>
        <p>
          Varyant {preview.products.length} · Hazır {preview.validation.validCount} · Eksik {" "}
          {preview.validation.invalidCount}
        </p>
        {readiness?.reasons.map((reason) => <p key={reason.code}>{reason.message}</p>)}
        <div className="dashboard-actions">
          <Link className="button button-primary" href="/panel/entegrasyonlar/trendyol/onizleme">
            Ürün önizlemesini aç
          </Link>
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/export">
            Trendyol JSON indir
          </Link>
        </div>
      </section>
    </main>
  );
}
