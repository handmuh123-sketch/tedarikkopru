import Link from "next/link";
import { redirect } from "next/navigation";
import { TaxonomyManager } from "@/components/catalog/taxonomy-manager";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

export default async function AdminBrandsPage() {
  const { user } = await requirePageUser();
  if (!["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole)) redirect("/panel");
  const brands = await database.brand.findMany({ orderBy: { name: "asc" } });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Katalog yönetimi</p>
          <h1>Markalar</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/admin/kategoriler">
            Kategoriler
          </Link>
          <Link className="button button-secondary" href="/admin/urunler">
            Ürün kuyruğu
          </Link>
        </div>
      </header>
      <TaxonomyManager
        kind="brands"
        initialItems={brands.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          active: item.status === "ACTIVE",
        }))}
      />
    </main>
  );
}
