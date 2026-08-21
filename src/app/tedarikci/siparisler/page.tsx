import Link from "next/link";

import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const supplierOrderRoles = ["OWNER", "ORG_ADMIN", "WAREHOUSE_OPERATOR"] as const;

export const dynamic = "force-dynamic";

export default async function SupplierOrdersPage() {
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: [...supplierOrderRoles] },
      organization: {
        type: { in: ["SUPPLIER", "BOTH"] },
        status: "ACTIVE",
        verificationStatus: "APPROVED",
      },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    return (
      <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
        <h1>Sipariş yetkisi bulunamadı</h1>
        <p>Owner, işletme admini veya depo operatörü rolü gerekir.</p>
      </main>
    );
  }
  const orders = await database.order.findMany({
    where: { supplierOrganizationId: membership.organizationId },
    include: {
      buyerOrganization: { select: { tradeName: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi operasyonu</p>
          <h1>Siparişler</h1>
          <p>{membership.organization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/panel">
          Panele dön
        </Link>
      </header>
      {orders.length === 0 ? (
        <section className="dashboard-card">
          <h2>Henüz sipariş yok</h2>
          <p>Alıcı ödeme tamamladığında işlem bekleyen siparişler burada görünür.</p>
        </section>
      ) : (
        <section className="order-list" aria-label="Tedarikçi siparişleri">
          {orders.map((order) => (
            <article className="dashboard-card order-card" key={order.id}>
              <div>
                <span className="status-pill">{order.status}</span>
                <h2>{order.publicNumber}</h2>
                <p>
                  {order.buyerOrganization.tradeName} · {order._count.items} satır
                </p>
              </div>
              <div>
                <strong>{formatTryMinor(order.totalAmountMinor)}</strong>
                <p>Oluşturulma: {order.createdAt.toLocaleDateString("tr-TR")}</p>
                <Link href={`/tedarikci/siparisler/${order.id}`}>Sipariş detayını aç</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
