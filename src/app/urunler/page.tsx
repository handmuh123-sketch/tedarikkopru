import Image from "next/image";
import Link from "next/link";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await database.product.findMany({
    where: {
      status: "ACTIVE",
      supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
    },
    include: {
      category: true,
      brand: true,
      supplierOrganization: true,
      variants: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 1 },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 48,
  });
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
          <p>Doğrulanmış tedarikçilerden pilot toptan ürünler.</p>
        </div>
        <Link className="button button-secondary" href="/giris">
          İşletme girişi
        </Link>
      </header>
      {products.length === 0 && (
        <section className="dashboard-card">
          <h2>Henüz yayında ürün yok</h2>
          <p>Onaylanan pilot ürünler burada görünecek.</p>
        </section>
      )}
      <section className="product-grid" aria-label="Yayındaki ürünler">
        {products.map((product) => {
          const variant = product.variants[0];
          const image = product.images[0];
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
                  {variant && (
                    <>
                      <strong className="product-price">
                        {formatTryMinor(variant.priceAmountMinor)}
                      </strong>
                      <small>
                        Minimum {variant.moq} adet · {variant.quantityStep}’şer artar
                      </small>
                    </>
                  )}
                  <span className="supplier-name">{product.supplierOrganization.tradeName}</span>
                </div>
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
