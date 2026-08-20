import Link from "next/link";
import { SignOutButton } from "@/components/auth/auth-forms";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

export default async function PanelPage() {
  const { user } = await requirePageUser();
  const memberships = await database.organizationMembership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">İşletme paneli</p>
          <h1>Merhaba, {user.name}.</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/oturumlar">
            Oturumlar
          </Link>
          <SignOutButton />
        </div>
      </header>
      <section className="dashboard-grid" aria-label="İşletmeleriniz">
        {memberships.map(({ organization, role }) => (
          <article className="dashboard-card" key={organization.id}>
            <span className="status-pill">{organization.verificationStatus}</span>
            <h2>{organization.tradeName}</h2>
            <p>{organization.legalName}</p>
            <dl>
              <dt>Rol</dt>
              <dd>{role}</dd>
              <dt>Tür</dt>
              <dd>{organization.type}</dd>
            </dl>
            {["SUPPLIER", "BOTH"].includes(organization.type) &&
              ["OWNER", "ORG_ADMIN", "CATALOG_MANAGER"].includes(role) && (
                <Link href="/tedarikci/urunler">Ürünleri yönet</Link>
              )}
            {["SUPPLIER", "BOTH"].includes(organization.type) &&
              ["OWNER", "ORG_ADMIN", "WAREHOUSE_OPERATOR"].includes(role) && (
                <Link href="/tedarikci/stok">Stokları yönet</Link>
              )}
          </article>
        ))}
      </section>
      <Link className="button button-primary" href="/onboarding">
        Yeni işletme oluştur
      </Link>
      <Link className="button button-secondary" href="/panel/favoriler">
        Favorilerim
      </Link>
      {memberships.some(
        ({ organization, role }) =>
          ["RESELLER", "BOTH"].includes(organization.type) &&
          ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"].includes(role),
      ) && (
        <Link className="button button-secondary" href="/panel/sepet">
          Sepetim
        </Link>
      )}
      {memberships.some(
        ({ organization, role }) =>
          ["RESELLER", "BOTH"].includes(organization.type) &&
          ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"].includes(role),
      ) && (
        <Link className="button button-secondary" href="/panel/siparisler">
          Siparişlerim
        </Link>
      )}
      {memberships.some(
        ({ organization, role }) =>
          ["SUPPLIER", "BOTH"].includes(organization.type) &&
          ["OWNER", "ORG_ADMIN", "WAREHOUSE_OPERATOR"].includes(role),
      ) && (
        <Link className="button button-secondary" href="/tedarikci/siparisler">
          Tedarikçi siparişleri
        </Link>
      )}
      {["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole) && (
        <Link className="button button-secondary" href="/admin/dogrulamalar">
          Doğrulama kuyruğu
        </Link>
      )}
      {[
        "PLATFORM_SUPER_ADMIN",
        "PLATFORM_ADMIN",
        "PLATFORM_OPERATIONS",
        "PLATFORM_SUPPORT",
      ].includes(user.platformRole) && (
        <Link className="button button-secondary" href="/admin/urunler">
          Ürün moderasyonu
        </Link>
      )}
      {["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole) && (
        <Link className="button button-secondary" href="/admin/importlar">
          Import işleri
        </Link>
      )}
    </main>
  );
}
