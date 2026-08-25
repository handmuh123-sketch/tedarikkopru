import { notFound } from "next/navigation";
import Link from "next/link";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { serverEnvironment } from "@/lib/env/server";

const adminRoles = [
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "PLATFORM_OPERATIONS",
  "PLATFORM_SUPPORT",
];

export const dynamic = "force-dynamic";

export default async function AdminMarketplaceIntegrationsPage() {
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const [connections, categories, brands, categoryMappings, brandMappings, jobs] =
    await Promise.all([
      database.marketplaceConnection.findMany({
        include: { organization: { select: { tradeName: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      database.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      database.brand.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
      database.marketplaceCategoryMapping.findMany({
        where: { channel: "TRENDYOL", isActive: true },
        select: { categoryId: true },
      }),
      database.marketplaceBrandMapping.findMany({
        where: { channel: "TRENDYOL", isActive: true },
        select: { brandId: true },
      }),
      database.marketplaceSyncJob.findMany({
        take: 12,
        include: { organization: { select: { tradeName: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  const mappedCategoryIds = new Set(categoryMappings.map((item) => item.categoryId));
  const mappedBrandIds = new Set(brandMappings.map((item) => item.brandId));
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform yönetimi</p>
          <h1>Pazaryeri entegrasyonları</h1>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      <section className="dashboard-card">
        <h2>Canlı özellik durumu</h2>
        <p>
          Trendyol:{" "}
          {serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL ? "Açık" : "Kapalı · test/önizleme modu"}
        </p>
        <p>Hepsiburada: {serverEnvironment.FEATURE_MARKETPLACE_HEPSIBURADA ? "Açık" : "Kapalı"}</p>
        <p>Amazon TR: {serverEnvironment.FEATURE_MARKETPLACE_AMAZON_TR ? "Açık" : "Kapalı"}</p>
      </section>
      <section className="dashboard-card">
        <h2>Bağlantılar</h2>
        {connections.length === 0 ? (
          <p>Henüz bağlantı yok.</p>
        ) : (
          <ul>
            {connections.map((connection) => (
              <li key={connection.id}>
                {connection.channel} · {connection.organization.tradeName} · {connection.status} ·
                Credential: {connection.credentialCiphertext ? "var" : "yok"} · Son hata:{" "}
                {connection.lastErrorCode ?? "yok"}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="dashboard-card">
        <h2>Trendyol eşleşme durumu</h2>
        <p>
          Kategori eşleşmesi: {categoryMappings.length}/{categories.length} · Marka eşleşmesi:{" "}
          {brandMappings.length}/{brands.length}
        </p>
        <Link className="button button-secondary" href="/admin/entegrasyonlar/trendyol">
          Trendyol eşleştirme merkezini aç
        </Link>
        <h3>Eşleşmemiş kategoriler</h3>
        <p>
          {categories
            .filter((category) => !mappedCategoryIds.has(category.id))
            .map((category) => category.name)
            .join(", ") || "Yok"}
        </p>
        <h3>Eşleşmemiş markalar</h3>
        <p>
          {brands
            .filter((brand) => !mappedBrandIds.has(brand.id))
            .map((brand) => brand.name)
            .join(", ") || "Yok"}
        </p>
      </section>
      <section className="dashboard-card">
        <h2>Son senkronizasyon işleri</h2>
        {jobs.length === 0 ? (
          <p>Henüz senkronizasyon işi yok.</p>
        ) : (
          <ul>
            {jobs.map((job) => (
              <li key={job.id}>
                {job.channel} · {job.organization.tradeName} · {job.status} · Başarılı{" "}
                {job.successCount} · Hatalı {job.failureCount} ·{" "}
                {job.safeErrorSummary ?? "Hata yok"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
