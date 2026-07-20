import Link from "next/link";
import { ProductSubmitButton } from "@/components/catalog/product-actions";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const catalogRoles = ["OWNER", "ORG_ADMIN", "CATALOG_MANAGER"] as const;

export default async function SupplierProductsPage() {
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: [...catalogRoles] },
      organization: { type: { in: ["SUPPLIER", "BOTH"] }, status: { not: "ARCHIVED" } },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  const products = membership
    ? await database.product.findMany({
        where: { supplierOrganizationId: membership.organizationId },
        include: { variants: { take: 1 }, category: true, brand: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const organizationId = membership?.organizationId;
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi kataloğu</p>
          <h1>Ürünler</h1>
          {membership && <p>{membership.organization.tradeName}</p>}
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/panel">
            Panele dön
          </Link>
          {membership && (
            <Link className="button button-primary" href="/tedarikci/urunler/yeni">
              Yeni ürün
            </Link>
          )}
        </div>
      </header>
      {!membership && (
        <section className="dashboard-card">
          <h2>Katalog yetkisi bulunamadı</h2>
          <p>SUPPLIER/BOTH işletmesinde owner, admin veya katalog yöneticisi rolü gerekir.</p>
        </section>
      )}
      {membership && products.length === 0 && <p>Henüz ürün yok. İlk pilot ürününüzü oluşturun.</p>}
      <section className="dashboard-grid" aria-label="Ürünleriniz">
        {products.map((product) => {
          const variant = product.variants[0];
          return (
            <article className="dashboard-card" key={product.id}>
              <span className="status-pill">{product.status}</span>
              <h2>{product.title}</h2>
              <p>
                {product.brand.name} · {product.category.name}
              </p>
              {variant && (
                <p>
                  <strong>{formatTryMinor(variant.priceAmountMinor)}</strong> · MOQ {variant.moq} ·
                  Adım {variant.quantityStep}
                </p>
              )}
              {product.moderationNote && (
                <p className="form-status error">Moderasyon: {product.moderationNote}</p>
              )}
              <div className="queue-actions">
                <Link className="button button-secondary" href={`/tedarikci/urunler/${product.id}`}>
                  Düzenle
                </Link>
                {["DRAFT", "REJECTED"].includes(product.status) && (
                  <ProductSubmitButton organizationId={organizationId!} productId={product.id} />
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
