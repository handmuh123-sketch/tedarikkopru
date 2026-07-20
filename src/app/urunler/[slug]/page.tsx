import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { getPageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { findPublicProductBySlug } from "@/modules/catalog/application/public-catalog";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const [product, pageUser] = await Promise.all([findPublicProductBySlug(slug), getPageUser()]);
  if (!product || product.variants.length === 0) notFound();
  const variant = product.variants[0]!;
  const favorite = pageUser
    ? Boolean(
        await database.productFavorite.findUnique({
          where: { userId_productId: { userId: pageUser.user.id, productId: product.id } },
          select: { id: true },
        }),
      )
    : false;
  const image = product.images[0];
  return (
    <main id="ana-icerik" className="catalog-page" tabIndex={-1}>
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
            {availableStock(variant.inventory!.onHand, variant.inventory!.safetyStock)} adet
          </p>
          <FavoriteButton productId={product.id} initial={favorite} />
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
