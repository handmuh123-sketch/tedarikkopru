import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { marketplaceProviders } from "@/modules/marketplace/domain/providers";

export const dynamic = "force-dynamic";

function connectionStatus(
  approved: boolean,
  connection: { status: string; credentialCiphertext: string | null } | null,
): { label: string; tone: StatusBadgeTone } {
  if (!approved) return { label: "İşletme onayı gerekli", tone: "review" };
  if (!connection) return { label: "Kurulum gerekli", tone: "missing" };
  if (connection.status === "ERROR") return { label: "Kontrol gerekli", tone: "error" };
  if (connection.status === "CONNECTED") return { label: "Bağlı", tone: "ready" };
  if (connection.credentialCiphertext) return { label: "Kimlik bilgileri kayıtlı", tone: "test" };
  return { label: "Kurulum gerekli", tone: "missing" };
}

export default async function MarketplaceIntegrationsPage() {
  const { user } = await requirePageUser();
  const memberships = await database.organizationMembership.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      organization: { type: { in: ["RESELLER", "BOTH"] }, status: { not: "ARCHIVED" } },
    },
    include: {
      organization: {
        include: { marketplaceConnections: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <Breadcrumbs items={[{ label: "Panel", href: "/panel" }, { label: "Pazaryeri" }]} />
      <header className="dashboard-header marketplace-hub-header">
        <div>
          <p className="eyebrow">Pazaryeri merkezi</p>
          <h1>Tek panelden tüm büyük satış kanallarına hazırlanın.</h1>
          <p>
            Trendyol ile sınırlı değil: Hepsiburada, Amazon Türkiye, n11, Pazarama, PttAVM,
            ÇiçekSepeti ve idefix aynı entegrasyon merkezinde yönetilir.
          </p>
        </div>
        <div className="marketplace-hub-count" aria-label="Desteklenen kanal sayısı">
          <strong>{marketplaceProviders.length}</strong>
          <span>pazaryeri kanalı</span>
        </div>
      </header>

      {memberships.length === 0 ? (
        <section className="empty-state" aria-labelledby="marketplace-empty-title">
          <h2 id="marketplace-empty-title">Önce alıcı işletmenizi hazırlayın</h2>
          <p>Pazaryeri bağlantıları doğrulanmış alıcı işletmesine bağlanır.</p>
          <Link className="button button-primary" href="/onboarding">
            Alıcı işletmesi oluştur
          </Link>
        </section>
      ) : null}

      {memberships.map(({ organization }) => {
        const approved =
          organization.status === "ACTIVE" && organization.verificationStatus === "APPROVED";
        const connections = new Map(
          organization.marketplaceConnections.map((connection) => [connection.channel, connection]),
        );
        return (
          <section className="marketplace-hub-section" key={organization.id}>
            <div className="card-heading-row marketplace-hub-org-heading">
              <div>
                <p className="eyebrow">{organization.tradeName}</p>
                <h2>Satış kanallarınız</h2>
              </div>
              <StatusBadge
                label={approved ? "İşletme onaylı" : "İşletme onayı bekleniyor"}
                tone={approved ? "ready" : "review"}
              />
            </div>

            <div className="marketplace-provider-grid">
              {marketplaceProviders.map((provider) => {
                const connection = connections.get(provider.channel) ?? null;
                return (
                  <article
                    className={`marketplace-provider-card provider-${provider.slug}`}
                    key={provider.channel}
                  >
                    <div className="marketplace-provider-card-top">
                      <div className="marketplace-provider-logo" aria-hidden="true">
                        {provider.name.slice(0, 2).toUpperCase()}
                      </div>
                      <StatusBadge {...connectionStatus(approved, connection)} />
                    </div>
                    <div>
                      <p className="eyebrow">{provider.name}</p>
                      <h3>{provider.shortDescription}</h3>
                    </div>
                    <div
                      className="marketplace-capability-list"
                      aria-label={`${provider.name} özellikleri`}
                    >
                      {provider.capabilities.map((capability) => (
                        <span key={capability}>{capability}</span>
                      ))}
                    </div>
                    <div className="marketplace-provider-actions">
                      <Link
                        className="button button-primary"
                        href={`/panel/entegrasyonlar/${provider.slug}`}
                      >
                        {connection ? "Bağlantıyı yönet" : "Entegrasyonu kur"}
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={`/api/v1/marketplace/${provider.slug}/export`}
                      >
                        Hazırlık JSON
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="dashboard-card marketplace-safety-card">
        <p className="eyebrow">Güvenli kanal açılışı</p>
        <h2>Canlı mağaza işlemleri gerçek API yetkisi olmadan çalışmaz.</h2>
        <p>
          Her kanal aynı katalog ve favori kaynağını kullanır. Önce ürün hazırlığı ve eşleme yapılır;
          canlı ürün, fiyat ve stok gönderimi yalnız ilgili pazaryerinin resmi API erişimi ile açılır.
        </p>
      </section>
    </main>
  );
}
