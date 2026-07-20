import Link from "next/link";
import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";
import { hasOrganizationPermission } from "@/modules/organizations/domain/permissions";

export default async function SupplierInventoryPage() {
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
  const canManage = membership
    ? hasOrganizationPermission(membership.role, "inventory:manage")
    : false;
  const variants =
    membership && canManage
      ? await database.productVariant.findMany({
          where: {
            supplierOrganizationId: membership.organizationId,
            product: { status: { not: "ARCHIVED" } },
          },
          include: { product: { select: { title: true, status: true } }, inventory: true },
          orderBy: { updatedAt: "desc" },
        })
      : [];

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi operasyonu</p>
          <h1>Stok yönetimi</h1>
          {membership && <p>{membership.organization.tradeName}</p>}
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/tedarikci/urunler">
            Ürünlere dön
          </Link>
          {membership && canManage && (
            <Link className="button button-secondary" href="/tedarikci/import">
              Ürün içe aktar
            </Link>
          )}
        </div>
      </header>
      {!membership || !canManage ? (
        <section className="dashboard-card">
          <h2>Stok yetkisi bulunamadı</h2>
          <p>Owner, işletme admini veya depo operatörü rolü gerekir.</p>
        </section>
      ) : null}
      {membership && canManage && variants.length === 0 && <p>Yönetilecek varyant bulunamadı.</p>}
      <section className="inventory-list" aria-label="Varyant stokları">
        {variants.map((variant) => {
          const inventory = variant.inventory;
          const onHand = inventory?.onHand ?? 0;
          const safetyStock = inventory?.safetyStock ?? 0;
          return (
            <article className="dashboard-card" key={variant.id}>
              <span className="status-pill">{variant.product.status}</span>
              <h2>{variant.product.title}</h2>
              <p>SKU {variant.sku}</p>
              <p>
                Kullanılabilir: <strong>{availableStock(onHand, safetyStock)}</strong> adet
              </p>
              <StockAdjustmentForm
                organizationId={membership!.organizationId}
                variantId={variant.id}
                onHand={onHand}
                safetyStock={safetyStock}
                version={inventory?.version ?? 0}
              />
            </article>
          );
        })}
      </section>
    </main>
  );
}
