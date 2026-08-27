import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { ProfitCalculator } from "@/components/catalog/profit-calculator";
import { AddToCartForm } from "@/components/orders/add-to-cart-form";
import { RfqCreateForm } from "@/components/rfq/rfq-create-form";
import { getPageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { findPublicProductBySlug } from "@/modules/catalog/application/public-catalog";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";
import { opportunityLevelLabel } from "@/modules/intelligence/opportunity-score";
import { getSupplierTrustScore } from "@/modules/intelligence/supplier-trust-service";
import { supplierTrustLabel } from "@/modules/intelligence/supplier-trust";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

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

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const [product, pageUser] = await Promise.all([findPublicProductBySlug(slug), getPageUser()]);
  if (!product || product.variants.length === 0) notFound();
  const variant = product.variants[0]!;
  const [favorite, buyerMembership, supplierTrust] = await Promise.all([
    pageUser
      ? database.productFavorite
          .findUnique({
            where: { userId_productId: { userId: pageUser.user.id, productId: product.id } },
            select: { id: true },
          })
          .then(Boolean)
      : Promise.resolve(false),
    pageUser
      ? database.organizationMembership.findFirst({
          where: {
            userId: pageUser.user.id,
            status: "ACTIVE",
            role: { in: ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"] },
            organization: {
              type: { in: ["RESELLER", "BOTH"] },
              status: "ACTIVE",
              verificationStatus: "APPROVED",
            },
          },
          include: {
            organization: { include: { buyerCart: { select: { supplierOrganizationId: true } } } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve(null),
    getSupplierTrustScore(product.supplierOrganizationId),
  ]);
  const image = product.images[0];
  return (
    <main id="ana-icerik" className="catalog-page product-intelligence-page" tabIndex={-1}>
      <nav className="catalog-nav" aria-label="İçerik yolu">
        <Link href="/urunler">Ürünler</Link>
        <span aria-hidden="true">/</span>
        <span>{product.category.name}</span>
      </nav>
      <article className="product-detail">
        <div className="product-detail-media">
          {image ? (
            <Image
              src={image.storageKey}
              alt={image.altText}
              fill
              sizes="(max-width: 860px) 100vw, 50vw"
              priority
            />
          ) : (
            <span aria-hidden="true">TK</span>
          )}
          {product.opportunity ? (
            <div className={`product-detail-radar score-${product.opportunity.level}`}>
              <strong>{product.opportunity.score}</strong>
              <span>Radar skoru</span>
            </div>
          ) : null}
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">
            {product.brand.name} · {product.category.name}
          </p>
          <h1>{product.title}</h1>
          <p className="hero-lead">{product.shortDescription}</p>
          <strong className="product-detail-price">
            {formatTryMinor(variant.priceAmountMinor)}
          </strong>
          <p>KDV hariç temel toptan fiyat · Para birimi {variant.currency}</p>
          <p>
            Kullanılabilir stok:{" "}
            {availableStock(
              variant.inventory!.onHand,
              variant.inventory!.safetyStock,
              variant.inventory!.reserved,
            )}{" "}
            adet
          </p>

          {product.opportunity ? (
            <section className="product-opportunity-panel" aria-labelledby="product-radar-title">
              <div className="product-opportunity-heading">
                <div>
                  <p className="eyebrow">TedarikKöprü Radar</p>
                  <h2 id="product-radar-title">{opportunityLevelLabel(product.opportunity.level)}</h2>
                </div>
                <div className={`product-opportunity-number level-${product.opportunity.level}`}>
                  {product.opportunity.score}/100
                </div>
              </div>
              <div className="opportunity-reasons">
                {product.opportunity.reasons.map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
              <div className="product-channel-readiness">
                <div>
                  <strong>{product.opportunity.readyChannelCount}/8 pazaryeri hazır</strong>
                  <span>Kategori, marka, görsel ve barkod hazırlığı birlikte kontrol edilir.</span>
                </div>
                {product.opportunity.readyChannels.length > 0 ? (
                  <div className="opportunity-channel-list">
                    {product.opportunity.readyChannels.map((channel) => (
                      <span key={channel}>{channelLabels[channel] ?? channel}</span>
                    ))}
                  </div>
                ) : (
                  <small>Eşlemeler tamamlandıkça hazır kanal sayısı otomatik yükselir.</small>
                )}
              </div>
              {pageUser ? (
                <Link className="button button-secondary" href="/panel/firsatlar">
                  Akıllı Ürün Radarı’nı aç
                </Link>
              ) : null}
            </section>
          ) : null}

          <section className="supplier-trust-panel" aria-labelledby="supplier-trust-title">
            <div className="product-opportunity-heading">
              <div>
                <p className="eyebrow">Tedarikçi güven sinyali</p>
                <h2 id="supplier-trust-title">{supplierTrustLabel(supplierTrust)}</h2>
              </div>
              <div className={`supplier-trust-score trust-${supplierTrust.level}`}>
                {supplierTrust.score === null ? "—" : `${supplierTrust.score}/100`}
              </div>
            </div>
            <p>
              {supplierTrust.available
                ? `${supplierTrust.sampleSize} gerçek sipariş operasyonundan kabul, sevkiyat, zamanında teslimat ve iade sinyalleri değerlendirildi.`
                : `${supplierTrust.sampleSize}/5 uygun operasyon var. Yeterli gerçek veri oluşmadan tedarikçiye puan vermiyoruz.`}
            </p>
            {supplierTrust.available ? (
              <div className="supplier-trust-metrics">
                <span>Kabul <strong>%{supplierTrust.metrics.acceptanceRate ?? 0}</strong></span>
                <span>Sevkiyat <strong>%{supplierTrust.metrics.fulfillmentRate ?? 0}</strong></span>
                <span>Zamanında <strong>%{supplierTrust.metrics.onTimeDeliveryRate ?? 0}</strong></span>
                <span>İade <strong>%{supplierTrust.metrics.returnRate ?? 0}</strong></span>
              </div>
            ) : null}
          </section>

          <ProfitCalculator wholesalePriceMinor={variant.priceAmountMinor} />

          <FavoriteButton productId={product.id} initial={favorite} />
          {buyerMembership ? (
            <>
              <AddToCartForm
                organizationId={buyerMembership.organizationId}
                variantId={variant.id}
                moq={variant.moq}
                quantityStep={variant.quantityStep}
                supplierConflict={Boolean(
                  buyerMembership.organization.buyerCart?.supplierOrganizationId &&
                    buyerMembership.organization.buyerCart.supplierOrganizationId !==
                      product.supplierOrganizationId,
                )}
              />
              <RfqCreateForm
                organizationId={buyerMembership.organizationId}
                variantId={variant.id}
                moq={variant.moq}
                quantityStep={variant.quantityStep}
              />
            </>
          ) : pageUser ? (
            <p className="form-help">
              Sepet için onaylı bir alıcı işletmesi ve satın alma yetkisi gerekir.
            </p>
          ) : (
            <Link className="button button-primary" href="/giris">
              Sepete eklemek için giriş yap
            </Link>
          )}
          <dl className="product-specs">
            <dt>Minimum sipariş</dt>
            <dd>{variant.moq} adet</dd>
            <dt>Sipariş adımı</dt>
            <dd>{variant.quantityStep} adet</dd>
            <dt>SKU</dt>
            <dd>{variant.sku}</dd>
            <dt>Paket içi</dt>
            <dd>{variant.packageQuantity} adet</dd>
            <dt>Hazırlık</dt>
            <dd>{product.handlingDays} iş günü</dd>
            <dt>Garanti</dt>
            <dd>{product.warrantyMonths ?? 0} ay</dd>
            <dt>Tedarikçi</dt>
            <dd>{product.supplierOrganization.tradeName}</dd>
          </dl>
          <div className="product-description">
            <h2>Ürün açıklaması</h2>
            <p>{product.description}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
