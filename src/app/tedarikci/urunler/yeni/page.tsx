import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/catalog/product-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

export default async function NewProductPage() {
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ORG_ADMIN", "CATALOG_MANAGER"] },
      organization: { type: { in: ["SUPPLIER", "BOTH"] }, status: { not: "ARCHIVED" } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/panel");
  const [categories, brands] = await Promise.all([
    database.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    database.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Pilot katalog</p>
          <h1>Yeni ürün</h1>
        </div>
        <Link className="button button-secondary" href="/tedarikci/urunler">
          Ürünlere dön
        </Link>
      </header>
      <section className="onboarding-card">
        <ProductForm
          organizationId={membership.organizationId}
          categories={categories}
          brands={brands}
        />
      </section>
    </main>
  );
}
