import Link from "next/link";
import { redirect } from "next/navigation";
import { TaxonomyManager } from "@/components/catalog/taxonomy-manager";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

export default async function AdminCategoriesPage() {
  const { user } = await requirePageUser();
  if (!["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole)) redirect("/panel");
  const categories = await database.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Katalog yönetimi</p>
          <h1>Kategoriler</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/admin/markalar">
            Markalar
          </Link>
          <Link className="button button-secondary" href="/admin/urunler">
            Ürün kuyruğu
          </Link>
        </div>
      </header>
      <TaxonomyManager
        kind="categories"
        initialItems={categories.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          active: item.isActive,
        }))}
      />
    </main>
  );
}
