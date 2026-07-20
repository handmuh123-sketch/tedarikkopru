import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { getPageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import {
  findPublicProducts,
  parseTryFilterMinor,
} from "@/modules/catalog/application/public-catalog";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

export const dynamic = "force-dynamic";
type SearchValue = string | string[] | undefined;
type Props = { searchParams: Promise<Record<string, SearchValue>> };
const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value);

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = first(params.q)?.trim().slice(0, 80) || undefined;
  const category = first(params.category)?.trim() || undefined;
  const brand = first(params.brand)?.trim() || undefined;
  const minPrice = first(params.minPrice);
  const maxPrice = first(params.maxPrice);
  const [products, categories, brands, pageUser] = await Promise.all([
    findPublicProducts({
      query,
      category,
      brand,
      minPriceMinor: parseTryFilterMinor(minPrice),
      maxPriceMinor: parseTryFilterMinor(maxPrice),
    }),
    database.category.findMany({
      where: { isActive: true },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    database.brand.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    getPageUser(),
  ]);
  const favoriteIds = pageUser
    ? new Set(
        (
          await database.productFavorite.findMany({
            where: { userId: pageUser.user.id, productId: { in: products.map((item) => item.id) } },
            select: { productId: true },
          })
        ).map((item) => item.productId),
      )
    : new Set<string>();

  return (
    <main id="ana-icerik" className="catalog-page" tabIndex={-1}>
      <header className="catalog-header">
        <div>
          <Link className="brand" href="/">
            <span className="brand-mark">TK</span>
            <span>TedarikKöprü</span>
          </Link>
          <p className="eyebrow">Onaylı B2B katalog</p>
          <h1>Telefon aksesuarları</h1>
          <p>Yalnız stokta ve satışa uygun, doğrulanmış tedarikçi ürünleri.</p>
        </div>
        <div className="dashboard-actions">
          {pageUser && (
            <Link className="button button-secondary" href="/panel/favoriler">
              Favorilerim
            </Link>
          )}
          <Link className="button button-secondary" href={pageUser ? "/panel" : "/giris"}>
            {pageUser ? "Panele dön" : "İşletme girişi"}
          </Link>
        </div>
      </header>
      <form className="catalog-filters" method="get" role="search">
        <label className="filter-search">
          Ürün ara
          <input name="q" defaultValue={query} maxLength={80} placeholder="Kablo, kılıf veya SKU" />
        </label>
        <label>
          Kategori
          <select name="category" defaultValue={category ?? ""}>
            <option value="">Tümü</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Marka
          <select name="brand" defaultValue={brand ?? ""}>
            <option value="">Tümü</option>
            {brands.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          En düşük fiyat (TL)
          <input name="minPrice" inputMode="decimal" defaultValue={minPrice} placeholder="50" />
        </label>
        <label>
          En yüksek fiyat (TL)
          <input name="maxPrice" inputMode="decimal" defaultValue={maxPrice} placeholder="500" />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="inStock" defaultChecked disabled />
          Yalnız stokta olanlar (zorunlu)
        </label>
        <button className="button button-primary" type="submit">
          Filtrele
        </button>
        <Link className="button button-secondary" href="/urunler">
          Temizle
        </Link>
      </form>
      {products.length === 0 && (
        <section className="dashboard-card">
          <h2>Sonuç bulunamadı</h2>
          <p>Arama veya filtreleri değiştirerek tekrar deneyin.</p>
        </section>
      )}
      <p role="status">{products.length} kullanılabilir ürün bulundu.</p>
      <section className="product-grid" aria-label="Yayındaki ürünler">
        {products.map((product) => {
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
                  {image ? (
                    <Image
                      src={image.storageKey}
                      alt={image.altText}
                      fill
                      sizes="(max-width: 520px) 100vw, 33vw"
                    />
                  ) : (
                    <span aria-hidden="true">TK</span>
                  )}
                </div>
                <div className="product-card-body">
                  <p className="product-meta">
                    {product.brand.name} · {product.category.name}
                  </p>
                  <h2>{product.title}</h2>
                  <p>{product.shortDescription}</p>
                  <strong className="product-price">
                    {formatTryMinor(variant.priceAmountMinor)}
                  </strong>
                  <small>
                    Minimum {variant.moq} adet · Kullanılabilir {stock} adet
                  </small>
                  <span className="supplier-name">{product.supplierOrganization.tradeName}</span>
                </div>
              </Link>
              <FavoriteButton productId={product.id} initial={favoriteIds.has(product.id)} />
            </article>
          );
        })}
      </section>
    </main>
  );
}
