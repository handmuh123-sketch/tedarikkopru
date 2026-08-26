import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { buildTrendyolPreview } from "@/modules/marketplace/application/trendyol-preview";

export default async function PanelPage() {
  const { user } = await requirePageUser();
  const [memberships, favoriteCount, preview] = await Promise.all([
    database.organizationMembership.findMany({
      where: { userId: user.id, status: "ACTIVE", organization: { status: { not: "ARCHIVED" } } },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }),
    database.productFavorite.count({ where: { userId: user.id } }),
    buildTrendyolPreview(user.id),
  ]);
  const buyerMembership = memberships.find(
    ({ organization, role }) =>
      ["RESELLER", "BOTH"].includes(organization.type) &&
      ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"].includes(role),
  );
  const supplierMembership = memberships.find(
    ({ organization, role }) =>
      ["SUPPLIER", "BOTH"].includes(organization.type) &&
      ["OWNER", "ORG_ADMIN", "CATALOG_MANAGER", "WAREHOUSE_OPERATOR"].includes(role),
  );
  const resumableMembership = memberships.find(
    ({ organization, role }) =>
      ["DRAFT", "NEEDS_CHANGES"].includes(organization.verificationStatus) &&
      ["OWNER", "ORG_ADMIN"].includes(role),
  );
  const pendingMembership = memberships.find(({ organization }) =>
    ["SUBMITTED", "IN_REVIEW"].includes(organization.verificationStatus),
  );
  const actions = buyerMembership
    ? [
        {
          href: "/urunler",
          title: "Ürünlere göz at",
          detail: "Onaylı tedarikçi kataloğunu inceleyin.",
        },
        {
          href: "/panel/favoriler",
          title: "Favorilerimi yönet",
          detail: `${favoriteCount} ürün seçili.`,
        },
        {
          href: "/panel/siparisler",
          title: "Siparişlerimi gör",
          detail: "Ödeme ve teslimat durumlarını takip edin.",
        },
        {
          href: "/panel/entegrasyonlar",
          title: "Pazaryerine aktar",
          detail: "Trendyol hazırlığını ve önizlemeyi açın.",
        },
      ]
    : supplierMembership
      ? [
          {
            href: "/tedarikci/urunler",
            title: "Ürünlerim",
            detail: "Kataloğunuzu yönetin ve yayına hazırlayın.",
          },
          {
            href: "/tedarikci/stok",
            title: "Stok",
            detail: "Kullanılabilir stokları güncelleyin.",
          },
          {
            href: "/tedarikci/siparisler",
            title: "Siparişler",
            detail: "Gelen siparişleri yönetin.",
          },
          {
            href: "/tedarikci/import",
            title: "İçe / dışa aktarım",
            detail: "Katalog verinizi güvenle işleyin.",
          },
        ]
      : [
          { href: "/urunler", title: "Ürünlere göz at", detail: "Onaylı B2B katalogla tanışın." },
          {
            href: "/panel/favoriler",
            title: "Favorilerim",
            detail: `${favoriteCount} ürün seçili.`,
          },
          {
            href: "/panel/isletmem",
            title: "İşletmem",
            detail: "İşletme bağlamınızı ve adreslerinizi yönetin.",
          },
          {
            href: "/onboarding",
            title: "İşletme oluştur",
            detail: "Ticari işlemler için doğrulama başlatın.",
          },
        ];
  const nextStep = resumableMembership
    ? {
        href: `/onboarding?organizationId=${resumableMembership.organizationId}`,
        title: "İşletme profilinizi tamamlayın",
        detail: `${resumableMembership.organization.tradeName} için eksik bilgileri tamamlayın.`,
        tone: "missing" as const,
      }
    : pendingMembership
      ? {
          href: "/panel/isletmem",
          title: "Başvurunuz incelemede",
          detail: `${pendingMembership.organization.tradeName} için platform incelemesi devam ediyor.`,
          tone: "review" as const,
        }
      : !buyerMembership && !supplierMembership
        ? {
            href: "/onboarding",
            title: "İşletme profilinizi tamamlayın",
            detail: "Alım, tedarik ve pazaryeri işlemlerine başlamak için işletmenizi ekleyin.",
            tone: "missing" as const,
          }
        : preview.validation.invalidCount > 0 && buyerMembership
          ? {
              href: "/panel/entegrasyonlar",
              title: `Trendyol eşleştirmelerinde ${preview.validation.invalidCount} ürün eksik`,
              detail: "Eksikleri ürün bazında inceleyin; canlı aktarım yapılmaz.",
              tone: "test" as const,
            }
          : null;

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">İşletme paneli</p>
          <h1>Merhaba, {user.name}.</h1>
          <p>Bugün ne yapmak istiyorsunuz?</p>
        </div>
      </header>
      {nextStep ? (
        <Link className="next-step-card" href={nextStep.href}>
          <StatusBadge tone={nextStep.tone}>Sonraki adım</StatusBadge>
          <div>
            <h2>{nextStep.title}</h2>
            <p>{nextStep.detail}</p>
          </div>
          <span>Devam et</span>
        </Link>
      ) : null}
      <section className="task-grid" aria-label="Sık kullanılan işlemler">
        {actions.map((action) => (
          <Link className="task-card" href={action.href} key={action.href}>
            <h2>{action.title}</h2>
            <p>{action.detail}</p>
            <span>Aç</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
