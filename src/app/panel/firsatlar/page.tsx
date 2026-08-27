import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/catalog/favorite-button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { findProductOpportunities } from "@/modules/intelligence/opportunity-service";
import { opportunityLevelLabel } from "@/modules/intelligence/opportunity-score";
import { supplierTrustLabel } from "@/modules/intelligence/supplier-trust";

export const dynamic = "force-dynamic";

const channelLabels: Record<string, string> = {
  TRENDYOL: "Trendyol",
  HEPSIBURADA: "Hepsiburada",
  AMAZON_TR: "Amazon TR",
  N11: "n11",
  PAZARAMA: "Pazarama",
  PTTAVM: "PttAVM",
  CICEKSEPETI: "ÇiçekSepeti",
  IDEFIX: "idefix",
};

export default async function OpportunitiesPage() {
  const { user } = await requirePageUser();
  const opportunities = await findProductOpportunities(30);
  const favorites = new Set(
    (
      await database.productFavorite.findMany({
        where: { userId: user.id, productId: { in: opportunities.map((item) => item.id) } },
        select: { productId: true },
      })
    ).map((item) => item.productId),
  );

  const excellent = opportunities.filter((item) => item.opportunity.score >= 80).length;
  const lowMoq = opportunities.filter((item) => item.variant.moq <= 3).length;
  const fast = opportunities.filter((item) => item.handlingDays <= 2).length;
  const marketplaceReady = opportunities.filter((item) => item.opportunity.readyChannelCount > 0).length;

  return (
    <main id="ana-icerik" className="dashboard-page opportunity-page" tabIndex={-1}>
      <Breadcrumbs items={[{ label: "Panel", href: "/panel" }, { label: "Akıllı Ürün Radarı" }]} />

      <header className="opportunity-hero">
        <div>
          <p className="eyebrow">TedarikKöprü Radar</p>
          <h1>Satışa daha hazır ürünleri tek bakışta yakalayın.</h1>
          <p>
            Radar; stok derinliği, minimum sipariş, hazırlık süresi, ürün verisi ve pazaryeri
            eşlemelerini birlikte değerlendirir. Puan satış garantisi değildir; ürün hazırlık
            kalitesini karşılaştırmanız için şeffaf bir önceliklendirmedir.
          </p>
          <div className="dashboard-actions">
            <Link className="button button-primary" href="/urunler?sort=opportunity">
              Fırsat skoruna göre kataloğu aç
            </Link>
            <Link className="button button-secondary" href="/panel/entegrasyonlar">
              Pazaryeri merkezine git
            </Link>
          </div>
        </div>
        <div className="opportunity-hero-score" aria-label="Radardaki ürün sayısı">
          <strong>{opportunities.length}</strong>
          <span>ürün analiz edildi</span>
        </div>
      </header>

      <section className="opportunity-summary-grid" aria-label="Fırsat özeti">
        <article>
          <span>80+ skor</span>
          <strong>{excellent}</strong>
          <small>Çok güçlü hazırlık sinyali</small>
        </article>
        <article>
          <span>Düşük MOQ</span>
          <strong>{lowMoq}</strong>
          <small>3 adet ve altı minimum sipariş</small>
        </article>
        <article>
          <span>Hızlı hazırlık</span>
          <strong>{fast}</strong>
          <small>2 iş günü ve altı</small>
        </article>
        <article>
          <span>Pazaryeri hazır</span>
          <strong>{marketplaceReady}</strong>
          <small>En az bir kanalda kategori + marka eşlemesi</small>
        </article>
      </section>

      {opportunities.length === 0 ? (
        <section className="empty-state">
          <h2>Radar için uygun ürün bulunamadı</h2>
          <p>Yayındaki ve stokta olan tedarikçi ürünleri geldikçe burada otomatik sıralanacak.</p>
          <Link className="button button-secondary" href="/urunler">
            Kataloğa dön
          </Link>
        </section>
      ) : (
        <section className="opportunity-grid" aria-label="Akıllı ürün fırsatları">
          {opportunities.map((item, index) => (
            <article className="opportunity-card" key={item.id}>
              <div className="opportunity-card-media">
                {item.image ? (
                  <Image
                    src={item.image.storageKey}
                    alt={item.image.altText}
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                  />
                ) : (
                  <span aria-hidden="true">TK</span>
                )}
                <span className="opportunity-rank">#{index + 1}</span>
                <div className={`opportunity-score score-${item.opportunity.level}`}>
                  <strong>{item.opportunity.score}</strong>
                  <span>/100</span>
                </div>
              </div>

              <div className="opportunity-card-body">
                <div className="opportunity-card-heading">
                  <div>
                    <p className="eyebrow">
                      {item.brandName} · {item.categoryName}
                    </p>
                    <h2>{item.title}</h2>
                  </div>
                  <span className={`opportunity-level level-${item.opportunity.level}`}>
                    {opportunityLevelLabel(item.opportunity.level)}
                  </span>
                </div>

                <p>{item.shortDescription}</p>

                <div className="opportunity-kpis">
                  <div>
                    <span>Toptan fiyat</span>
                    <strong>{formatTryMinor(item.variant.priceAmountMinor)}</strong>
                  </div>
                  <div>
                    <span>MOQ</span>
                    <strong>{item.variant.moq}</strong>
                  </div>
                  <div>
                    <span>Stok</span>
                    <strong>{item.variant.availableStock}</strong>
                  </div>
                  <div>
                    <span>Hazırlık</span>
                    <strong>{item.handlingDays} gün</strong>
                  </div>
                </div>

                <div className="opportunity-reasons" aria-label="Öne çıkma nedenleri">
                  {item.opportunity.reasons.map((reason) => (
                    <span key={reason}>{reason}</span>
                  ))}
                </div>

                <div className="opportunity-channels">
                  <div>
                    <strong>{item.opportunity.readyChannelCount}/8 kanal</strong>
                    <span>kategori + marka + temel listeleme verisi hazır</span>
                  </div>
                  {item.opportunity.readyChannels.length > 0 ? (
                    <div className="opportunity-channel-list">
                      {item.opportunity.readyChannels.map((channel) => (
                        <span key={channel}>{channelLabels[channel] ?? channel}</span>
                      ))}
                    </div>
                  ) : (
                    <small>Pazaryeri eşlemeleri tamamlandıkça kanal skoru otomatik yükselir.</small>
                  )}
                </div>

                {item.supplierTrust ? (
                  <div className="supplier-trust-strip">
                    <div>
                      <span>Tedarikçi güven sinyali</span>
                      <strong>{supplierTrustLabel(item.supplierTrust)}</strong>
                    </div>
                    <div className={`supplier-trust-score trust-${item.supplierTrust.level}`}>
                      {item.supplierTrust.score === null ? "—" : `${item.supplierTrust.score}/100`}
                    </div>
                    <small>
                      {item.supplierTrust.available
                        ? `${item.supplierTrust.sampleSize} gerçek operasyon üzerinden; kabul, sevkiyat, zamanında teslimat ve iade sinyalleri.`
                        : `${item.supplierTrust.sampleSize}/5 uygun operasyon. Yeterli veri oluşmadan puan yayınlanmaz.`}
                    </small>
                  </div>
                ) : null}

                <div className="opportunity-card-footer">
                  <div>
                    <span>Tedarikçi</span>
                    <strong>{item.supplierName}</strong>
                  </div>
                  <div className="opportunity-card-actions">
                    <FavoriteButton productId={item.id} initial={favorites.has(item.id)} />
                    <Link className="button button-primary" href={`/urunler/${item.slug}`}>
                      Ürünü incele
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="dashboard-card opportunity-methodology">
        <div>
          <p className="eyebrow">Şeffaf puanlama</p>
          <h2>Radar neye bakıyor?</h2>
          <p>
            Gizli bir “satış tahmini” üretmiyoruz. Skor yalnız TedarikKöprü’de doğrulanabilen
            operasyon sinyallerinden oluşur ve yeni veri geldikçe değişir. Tedarikçi güven puanı
            ise en az 5 gerçek operasyon olmadan yayınlanmaz.
          </p>
        </div>
        <div className="opportunity-method-grid">
          <span><strong>20</strong> Stok derinliği</span>
          <span><strong>15</strong> Düşük MOQ</span>
          <span><strong>15</strong> Hazırlık hızı</span>
          <span><strong>15</strong> Görsel + barkod</span>
          <span><strong>20</strong> Pazaryeri eşlemeleri</span>
          <span><strong>10</strong> Doğrulanmış tedarikçi</span>
        </div>
      </section>
    </main>
  );
}
