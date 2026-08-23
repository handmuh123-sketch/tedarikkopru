import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

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
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Alıcı listesi</p>
          <h1>Favori ürünlerim</h1>
        </div>
        <div className="dashboard-actions">
          {visible.length > 0 && (
            <a className="button button-primary" href="/api/v1/exports/favorites/xml">
              XML indir
            </a>
          )}
          <Link className="button button-secondary" href="/urunler">
            Kataloğa dön
          </Link>
        </div>
      </header>
      {visible.length === 0 && <p>Henüz kullanılabilir bir favori ürününüz yok.</p>}
      <section className="product-grid" aria-label="Favori ürünler">
        {visible.map(({ product }) => {
          const variant = product.variants[0]!;
          const image = product.images[0];
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
