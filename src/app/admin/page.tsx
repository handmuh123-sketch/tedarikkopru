import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";

const adminRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "PLATFORM_OPERATIONS",
  "PLATFORM_SUPPORT",
  "PLATFORM_FINANCE",
]);

export default async function AdminHomePage() {
  const { user } = await requirePageUser();
  if (!adminRoles.has(user.platformRole)) notFound();

  const canManageCatalog = ["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole);
  const canViewOperations = [
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_ADMIN",
    "PLATFORM_OPERATIONS",
    "PLATFORM_SUPPORT",
  ].includes(user.platformRole);
  const actions = [
    ...(canViewOperations
      ? [
          {
            href: "/admin/dogrulamalar",
            title: "Doğrulama başvuruları",
            description: "İşletme inceleme kuyruğunu yönetin.",
          },
        ]
      : []),
    ...(canManageCatalog
      ? [
          {
            href: "/admin/urunler",
            title: "Katalog yönetimi",
            description: "Ürün, kategori ve marka işlemlerini izleyin.",
          },
          {
            href: "/admin/entegrasyonlar",
            title: "Pazaryeri eşleştirmeleri",
            description: "Kanal hazırlığını ve eşleşme durumunu görün.",
          },
        ]
      : []),
    ...(canViewOperations
      ? [
          {
            href: "/admin/operasyonlar",
            title: "Sistem durumu",
            description: "Sipariş, ödeme ve iade operasyonlarını takip edin.",
          },
        ]
      : []),
  ];

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Yönetim</p>
          <h1>Platform operasyonları</h1>
          <p>İnceleme, katalog ve operasyon işlerini ayrı ve sade bir alanda yönetin.</p>
        </div>
        <StatusBadge tone="review">Yetkili kullanıcı</StatusBadge>
      </header>
      <section className="task-grid" aria-label="Yönetim işlemleri">
        {actions.map((action) => (
          <Link className="task-card" href={action.href} key={action.href}>
            <h2>{action.title}</h2>
            <p>{action.description}</p>
            <span>İşlemleri aç</span>
          </Link>
        ))}
      </section>
      {actions.length === 0 ? (
        <section className="empty-state">
          <h2>Bu rol için açık bir yönetim kuyruğu yok</h2>
          <p>Yetkiniz güncellendiğinde ilgili işlemler burada görünür.</p>
        </section>
      ) : null}
    </main>
  );
}
