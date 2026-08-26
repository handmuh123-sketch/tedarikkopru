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
          icon: "⌕",
        },
        {
          href: "/panel/favoriler",
          title: "Favorilerimi yönet",
          detail: `${favoriteCount} ürün seçili.`,
          icon: "♡",
        },
        {
          href: "/panel/siparisler",
          title: "Siparişlerimi gör",
          detail: "Ödeme ve teslimat durumlarını takip edin.",
          icon: "▣",
        },
        {
          href: "/panel/entegrasyonlar",
          title: "Pazaryerine aktar",
          detail: "Trendyol hazırlığını ve önizlemeyi açın.",
          icon: "↗",
        },
      ]
    : supplierMembership
      ? [
          {
            href: "/tedarikci/urunler",
            title: "Ürünlerim",
            detail: "Kataloğunuzu yönetin ve yayına hazırlayın.",
            icon: "◆",
          },
          {
            href: "/tedarikci/stok",
            title: "Stok",
            detail: "Kullanılabilir stokları güncelleyin.",
            icon: "▤",
          },
          {
            href: "/tedarikci/siparisler",
            title: "Siparişler",
            detail: "Gelen siparişleri yönetin.",
            icon: "▣",
          },
          {
            href: "/tedarikci/import",
            title: "İçe / dışa aktarım",
            detail: "Katalog verinizi güvenle işleyin.",
            icon: "⇅",
          },
        ]
      : [
          {
            href: "/urunler",
            title: "Ürünlere göz at",
            detail: "Onaylı B2B katalogla tanışın.",
            icon: "⌕",
          },
          {
            href: "/panel/favoriler",
            title: "Favorilerim",
            detail: `${favoriteCount} ürün seçili.`,
            icon: "♡",
          },
          {
            href: "/panel/isletmem",
            title: "İşletmem",
            detail: "İşletme bağlamınızı ve adreslerinizi yönetin.",
            icon: "⌂",
          },
          {
            href: "/onboarding",
            title: "İşletme oluştur",
            detail: "Ticari işlemler için doğrulama başlatın.",
            icon: "+",
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

  const primaryAction = actions[0];
  const secondaryAction = buyerMembership
    ? { href: "/panel/entegrasyonlar", title: "Pazaryeri merkezi" }
    : supplierMembership
      ? { href: "/tedarikci/stok", title: "Stok merkezini aç" }
      : { href: "/panel/isletmem", title: "İşletmem" };
  const readyProducts = preview.validation.validCount;
  const previewProducts = preview.products.length;

  return (
    <main id="ana-icerik" className="dashboard-page panel-home" tabIndex={-1}>
      <header className="panel-hero">
        <div className="panel-hero-content">
          <p className="eyebrow">İşletme paneli</p>
          <h1>Merhaba, {user.name}.</h1>
          <p>
            Ürün keşfinden pazaryeri hazırlığına kadar en sık kullandığınız işlemler burada. Bugün
            ne yapmak istiyorsunuz?
          </p>
          <div className="panel-hero-actions">
            <Link className="button button-primary" href={primaryAction.href}>
              {primaryAction.title}
            </Link>
            <Link className="button button-secondary" href={secondaryAction.href}>
              {secondaryAction.title}
            </Link>
          </div>
        </div>
        <div className="panel-hero-spark" aria-hidden="true">
          TK
        </div>
      </header>

      <section className="panel-summary-grid" aria-label="Panel özeti">
        <article className="panel-summary-card">
          <span className="panel-summary-label">Favoriler</span>
          <strong className="panel-summary-value">{favoriteCount}</strong>
          <span className="panel-summary-note">Seçtiğiniz ürün</span>
        </article>
        <article className="panel-summary-card">
          <span className="panel-summary-label">İşletmeler</span>
          <strong className="panel-summary-value">{memberships.length}</strong>
          <span className="panel-summary-note">Aktif erişim</span>
        </article>
        <article className="panel-summary-card">
          <span className="panel-summary-label">Pazaryeri hazırlığı</span>
          <strong className="panel-summary-value">
            {readyProducts}/{previewProducts}
          </strong>
          <span className="panel-summary-note">Hazır ürün / seçili ürün</span>
        </article>
      </section>

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
            <span className="task-card-icon" aria-hidden="true">
              {action.icon}
            </span>
            <h2>{action.title}</h2>
            <p>{action.detail}</p>
            <span className="task-card-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
