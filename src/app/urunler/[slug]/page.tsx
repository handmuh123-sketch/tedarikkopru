import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await database.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
    },
    include: {
      category: true,
      brand: true,
      supplierOrganization: true,
      variants: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
    },
  });
  if (!product || product.variants.length === 0) notFound();
  const variant = product.variants[0]!;
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
