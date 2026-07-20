import Link from "next/link";
import { CatalogImportForm } from "@/components/catalog/import-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { hasOrganizationPermission } from "@/modules/organizations/domain/permissions";

export default async function SupplierImportPage() {
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      organization: { type: { in: ["SUPPLIER", "BOTH"] }, status: { not: "ARCHIVED" } },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  const canImport = membership
    ? hasOrganizationPermission(membership.role, "catalog:import")
    : false;
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi kataloğu</p>
          <h1>Ürün içe/dışa aktarma</h1>
          {membership && <p>{membership.organization.tradeName}</p>}
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/tedarikci/stok">
            Stoklara dön
          </Link>
          {membership && canImport && (
            <a
              className="button button-secondary"
              href={`/api/v1/organizations/${membership.organizationId}/products/export`}
            >
              Güvenli CSV indir
            </a>
          )}
        </div>
      </header>
      {membership && canImport ? (
        <CatalogImportForm organizationId={membership.organizationId} />
      ) : (
        <section className="dashboard-card">
          <h2>Import yetkisi bulunamadı</h2>
          <p>Bu işlem için işletme owner veya admin rolü gerekir.</p>
        </section>
      )}
    </main>
  );
}
