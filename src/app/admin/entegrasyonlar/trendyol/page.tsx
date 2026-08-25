import { notFound } from "next/navigation";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { TrendyolMappingCenter } from "@/components/marketplace/trendyol-mapping-center";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { listTrendyolMetadata } from "@/modules/marketplace/application/metadata-service";

const adminRoles = ["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"];

export const dynamic = "force-dynamic";

function attributeKeys(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
}

export default async function TrendyolMappingPage() {
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const [
    categories,
    brands,
    products,
    categoryMappings,
    brandMappings,
    attributeMappings,
    metadata,
  ] = await Promise.all([
    database.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, path: true },
      orderBy: { name: "asc" },
    }),
    database.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    database.product.findMany({
      where: { status: "ACTIVE" },
      select: { attributes: true },
      take: 500,
    }),
    database.marketplaceCategoryMapping.findMany({
      where: { channel: "TRENDYOL" },
      orderBy: { createdAt: "desc" },
    }),
    database.marketplaceBrandMapping.findMany({
      where: { channel: "TRENDYOL" },
      orderBy: { createdAt: "desc" },
    }),
    database.marketplaceAttributeMapping.findMany({
      where: { categoryMapping: { channel: "TRENDYOL" } },
      orderBy: { createdAt: "desc" },
    }),
    listTrendyolMetadata(),
  ]);
  const productAttributeKeys = [
    ...new Set(products.flatMap((product) => attributeKeys(product.attributes))),
  ].sort();
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform yönetimi</p>
          <h1>Trendyol eşleştirme merkezi</h1>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      <TrendyolMappingCenter
        categories={categories}
        brands={brands}
        productAttributeKeys={productAttributeKeys}
        providerCategories={metadata.categories.map((item) => ({
          externalId: item.externalId,
          name: item.name,
          source: item.source,
          isLeaf: item.isLeaf,
        }))}
        providerBrands={metadata.brands.map((item) => ({
          externalId: item.externalId,
          name: item.name,
          source: item.source,
        }))}
        providerAttributes={metadata.attributes.map((item) => ({
          externalCategoryId: item.externalCategoryId,
          externalAttributeId: item.externalAttributeId,
          name: item.name,
          isRequired: item.isRequired,
          allowCustom: item.allowCustom,
          source: item.source,
          values: item.values.map((value) => ({
            externalId: value.externalId,
            name: value.name,
            source: value.source,
          })),
        }))}
        categoryMappings={categoryMappings}
        brandMappings={brandMappings}
        attributeMappings={attributeMappings}
      />
    </main>
  );
}
