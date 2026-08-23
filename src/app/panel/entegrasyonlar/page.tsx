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

export const dynamic = "force-dynamic";

const managerRoles = new Set(["OWNER", "ORG_ADMIN"]);

export default async function MarketplaceIntegrationsPage() {
  const { user } = await requirePageUser();
  const [memberships, preview] = await Promise.all([
    database.organizationMembership.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
        organization: {
          type: { in: ["RESELLER", "BOTH"] },
          status: "ACTIVE",
          verificationStatus: "APPROVED",
        },
      },
      include: {
        organization: {
          include: { marketplaceConnections: { where: { channel: "TRENDYOL" }, take: 1 } },
        },
      },
    }),
    buildTrendyolPreview(user.id),
  ]);
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
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/preview">
            Önizlemeyi aç
          </Link>
          <Link className="button button-secondary" href="/api/v1/marketplace/trendyol/export">
            Trendyol JSON indir
          </Link>
        </div>
        {preview.validation.errors > 0 && (
          <p>
            Eksik kategori, marka, özellik veya görsel eşleşmeleri yayın öncesi düzeltilmelidir.
          </p>
        )}
      </section>
      {memberships.length === 0 && (
        <p>Onaylı alıcı işletmeniz olmadığı için pazaryeri bağlantısı yapılandırılamaz.</p>
      )}
      {memberships.map(({ organization, role }) => {
        const connection = organization.marketplaceConnections[0] ?? null;
        const canManage = managerRoles.has(role);
        return (
          <section className="dashboard-card" key={organization.id}>
            <h2>Trendyol · {organization.tradeName}</h2>
            <p>Durum: {connection?.status ?? "Bağlı değil"}</p>
            <p>Credential: {connection?.credentialCiphertext ? "Yapılandırıldı" : "Yok"}</p>
            <p>
              Son senkronizasyon:{" "}
              {connection?.lastSuccessAt?.toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              }) ?? "Henüz yok"}
            </p>
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
                      liveEnabled={serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL}
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
          </section>
        );
      })}
    </main>
  );
}
