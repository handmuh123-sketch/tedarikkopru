import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MarketplaceConnectionTestButton,
  MarketplacePublishButton,
} from "@/components/marketplace/marketplace-actions";
import { MarketplaceConnectionForm } from "@/components/marketplace/marketplace-connection-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { buildMarketplaceChannelPreview } from "@/modules/marketplace/application/channel-preview";
import { marketplaceProviderBySlug } from "@/modules/marketplace/domain/providers";

export const dynamic = "force-dynamic";

const managerRoles = new Set(["OWNER", "ORG_ADMIN"]);

type PageProps = { params: Promise<{ channel: string }> };

export default async function MarketplaceChannelPage({ params }: PageProps) {
  const { channel: channelSlug } = await params;
  const provider = marketplaceProviderBySlug(channelSlug);
  if (!provider || provider.channel === "TRENDYOL") notFound();

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
          include: {
            marketplaceConnections: { where: { channel: provider.channel }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    buildMarketplaceChannelPreview(user.id, provider.channel),
  ]);

  if (!membership) {
    return (
      <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
        <Breadcrumbs
          items={[
            { label: "Panel", href: "/panel" },
            { label: "Pazaryeri", href: "/panel/entegrasyonlar" },
            { label: provider.name },
          ]}
        />
        <section className="empty-state">
          <h1>{provider.name} için önce alıcı işletmesi oluşturun</h1>
          <p>Marketplace bağlantıları doğrulanmış alıcı işletmelerine bağlanır.</p>
          <Link className="button button-primary" href="/onboarding">
            İşletme oluştur
          </Link>
        </section>
      </main>
    );
  }

  const { organization, role } = membership;
  const connection = organization.marketplaceConnections[0] ?? null;
  const canManage = managerRoles.has(role);
  const approved =
    organization.status === "ACTIVE" && organization.verificationStatus === "APPROVED";
  const directLivePublish = provider.channel === "PTTAVM" || provider.channel === "IDEFIX";
  const liveReady =
    directLivePublish &&
    connection?.status === "CONNECTED" &&
    preview.validation.invalidCount === 0;

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <Breadcrumbs
        items={[
          { label: "Panel", href: "/panel" },
          { label: "Pazaryeri", href: "/panel/entegrasyonlar" },
          { label: provider.name },
        ]}
      />
      <header className="dashboard-header marketplace-channel-header">
        <div>
          <p className="eyebrow">{provider.name} entegrasyonu</p>
          <h1>{provider.name} mağazanızı TedarikKöprü’ye bağlayın</h1>
          <p>{provider.shortDescription}</p>
        </div>
        <StatusBadge
          label={
            connection?.status === "CONNECTED"
              ? "Bağlı"
              : Boolean(connection?.credentialCiphertext)
                ? "Kimlik bilgileri kayıtlı"
                : "Kurulum gerekli"
          }
          tone={
            connection?.status === "CONNECTED"
              ? "ready"
              : Boolean(connection?.credentialCiphertext)
                ? "test"
                : "missing"
          }
        />
      </header>

      <section className="dashboard-card marketplace-channel-card">
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">{organization.tradeName}</p>
            <h2>Bağlantı ayarları</h2>
          </div>
          <StatusBadge
            label={approved ? "İşletme onaylı" : "İşletme onayı gerekli"}
            tone={approved ? "ready" : "review"}
          />
        </div>
        {!approved ? (
          <p>
            Canlı API kimlik bilgileri, işletme doğrulaması tamamlandıktan sonra kaydedilebilir.
          </p>
        ) : canManage ? (
          <>
            <MarketplaceConnectionForm
              channel={provider.channel}
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
                  providerName={provider.name}
                />
                {directLivePublish ? (
                  <MarketplacePublishButton
                    connectionId={connection.id}
                    liveEnabled={liveReady}
                    organizationId={organization.id}
                    providerName={provider.name}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p>
            Bağlantı kimlik bilgilerini yalnız işletme sahibi veya işletme yöneticisi
            değiştirebilir.
          </p>
        )}
      </section>

      <section className="dashboard-card marketplace-channel-card">
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">Ürün hazırlığı</p>
            <h2>Favorileriniz bu kanal için kontrol edildi</h2>
          </div>
          <StatusBadge
            label={preview.validation.invalidCount === 0 ? "Hazır" : "Eşleme gerekli"}
            tone={preview.validation.invalidCount === 0 ? "ready" : "missing"}
          />
        </div>
        <p>
          Varyant {preview.products.length} · Hazır {preview.validation.validCount} · Eksik{" "}
          {preview.validation.invalidCount}
        </p>
        <div className="marketplace-capability-list" aria-label={`${provider.name} özellikleri`}>
          {provider.capabilities.map((capability) => (
            <span key={capability}>{capability}</span>
          ))}
        </div>
        <div className="dashboard-actions">
          <Link
            className="button button-primary"
            href={`/api/v1/marketplace/${provider.slug}/export`}
          >
            {provider.name} hazırlık JSON’unu indir
          </Link>
          <Link className="button button-secondary" href="/panel/favoriler">
            Favorileri düzenle
          </Link>
        </div>
        <p className="marketplace-provider-note">
          {directLivePublish
            ? `${provider.name} için resmi canlı ürün API akışı hazırdır. Gönderim butonu yalnız bağlantı testi ve ürün eşlemeleri başarılı olduğunda açılır.`
            : "Bağlantı testi resmi sağlayıcı kimlik doğrulamasını kullanır. Canlı ürün gönderimi, sağlayıcının ürün endpointi için mağaza/entegratör yetkisi tamamlandığında açılır; hazırlık ve eşleme ekranı şimdiden kullanılabilir."}
        </p>
      </section>
    </main>
  );
}
