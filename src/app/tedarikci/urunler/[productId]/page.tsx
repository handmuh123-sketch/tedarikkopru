import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/catalog/product-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

type Props = { params: Promise<{ productId: string }> };
export default async function EditProductPage({ params }: Props) {
  const { user } = await requirePageUser();
  const { productId } = await params;
  const product = await database.product.findFirst({
    where: {
      id: productId,
      supplierOrganization: {
        memberships: {
          some: {
            userId: user.id,
            status: "ACTIVE",
            role: { in: ["OWNER", "ORG_ADMIN", "CATALOG_MANAGER"] },
          },
        },
      },
    },
    include: { variants: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!product || !product.variants[0]) notFound();
  const [categories, brands] = await Promise.all([
    database.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
          <p className="eyebrow">Tedarikçi kataloğu</p>
          <h1>Ürünü düzenle</h1>
        </div>
        <Link className="button button-secondary" href="/tedarikci/urunler">
          Ürünlere dön
        </Link>
      </header>
      <section className="onboarding-card">
        <ProductForm
          organizationId={product.supplierOrganizationId}
          categories={categories}
          brands={brands}
          existing={{
            id: product.id,
            categoryId: product.categoryId,
            brandId: product.brandId,
            title: product.title,
            slug: product.slug,
            shortDescription: product.shortDescription,
            description: product.description,
            originCountry: product.originCountry,
            vatRateBasisPoints: product.vatRateBasisPoints,
            warrantyMonths: product.warrantyMonths,
            handlingDays: product.handlingDays,
            variant: product.variants[0],
          }}
        />
      </section>
    </main>
  );
}
