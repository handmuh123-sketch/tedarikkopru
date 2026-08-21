import { redirect } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { ProductModerationActions } from "@/components/catalog/product-actions";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

export default async function AdminProductsPage() {
  const { user } = await requirePageUser();
  if (!["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole)) redirect("/panel");
  const products = await database.product.findMany({
    where: { status: { in: ["PENDING_REVIEW", "REJECTED"] } },
    include: { supplierOrganization: true, category: true, brand: true, variants: { take: 1 } },
    orderBy: { updatedAt: "asc" },
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform yönetimi</p>
          <h1>Ürün moderasyonu</h1>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      {products.length === 0 && <p>Moderasyon bekleyen ürün yok.</p>}
      <section className="dashboard-grid">
        {products.map((product) => {
          const variant = product.variants[0];
          return (
            <article className="dashboard-card" key={product.id}>
              <span className="status-pill">{product.status}</span>
              <h2>{product.title}</h2>
              <p>
                {product.supplierOrganization.tradeName} · {product.brand.name} ·{" "}
                {product.category.name}
              </p>
              {variant && (
                <p>
                  {variant.sku} · <strong>{formatTryMinor(variant.priceAmountMinor)}</strong> · MOQ{" "}
                  {variant.moq}
                </p>
              )}
              <p>{product.shortDescription}</p>
              {product.status === "PENDING_REVIEW" && (
                <ProductModerationActions productId={product.id} />
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
