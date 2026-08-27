import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

export default async function FavoritesPage() {
  const { user } = await requirePageUser();
  const favorites = await database.productFavorite.findMany({
    where: {
      userId: user.id,
      product: {
        status: "ACTIVE",
        supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
        variants: { some: { status: "ACTIVE", inventory: { is: { onHand: { gt: 0 } } } } },
      },
    },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          variants: { where: { status: "ACTIVE" }, include: { inventory: true }, take: 1 },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const visible = favorites.filter(({ product }) => {
    const inventory = product.variants[0]?.inventory;
    return inventory && inventory.onHand > inventory.safetyStock;
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <Breadcrumbs items={[{ href: "/panel", label: "Ana sayfa" }, { label: "Favorilerim" }]} />
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Ürün seçimi</p>
          <h1>Favori ürünlerim</h1>
          <p>{visible.length} ürün seçildi</p>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-primary" href="/panel/entegrasyonlar">
            Pazaryerine aktar
          </Link>
          <Link className="button button-secondary" href="/api/v1/exports/favorites/xml">
            XML indir
          </Link>
        </div>
      </header>
      {visible.length === 0 ? (
        <section className="empty-state">
          <h2>Henüz favori ürününüz yok</h2>
          <p>Ürünleri kaydederek pazaryeri önizlemesine veya XML listesine ekleyebilirsiniz.</p>
          <Link className="button button-primary" href="/urunler">
            Ürünlere göz at
          </Link>
        </section>
      ) : null}
      <section className="product-grid" aria-label="Favori ürünler">
        {visible.map(({ product }) => {
          const variant = product.variants[0]!;
          const image = product.images[0];
          const stock = availableStock(
            variant.inventory!.onHand,
            variant.inventory!.safetyStock,
            variant.inventory!.reserved,
          );
          return (
            <article className="product-card" key={product.id}>
              <Link href={`/urunler/${product.slug}`}>
                <div className="product-media">
                  {image ? <Image src={image.storageKey} alt={image.altText} fill /> : "TK"}
                </div>
                <div className="product-card-body">
                  <p className="product-meta">
                    {product.brand.name} · {product.category.name}
                  </p>
                  <h2>{product.title}</h2>
                  <strong className="product-price">
                    {formatTryMinor(variant.priceAmountMinor)}
                  </strong>
                  <small>
                    SKU: {variant.sku} · Kullanılabilir {stock} adet
                  </small>
                </div>
              </Link>
              <FavoriteButton productId={product.id} initial />
            </article>
          );
        })}
      </section>
    </main>
  );
}
