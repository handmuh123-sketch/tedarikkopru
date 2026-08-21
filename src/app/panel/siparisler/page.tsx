import Link from "next/link";

import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { releaseExpiredReservations } from "@/modules/orders/application/order-service";

export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage() {
  const { user } = await requirePageUser();
  await releaseExpiredReservations();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"] },
      organization: {
        type: { in: ["RESELLER", "BOTH"] },
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
        <h1>Siparişler kullanılamıyor</h1>
      </main>
    );
  }
  const orders = await database.order.findMany({
    where: { buyerOrganizationId: membership.organizationId },
    include: {
      supplierOrganization: { select: { tradeName: true } },
      payments: { select: { status: true }, take: 1 },
      _count: { select: { items: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{membership.organization.tradeName}</p>
          <h1>Siparişlerim</h1>
        </div>
        <Link className="button button-secondary" href="/panel">
          Panele dön
        </Link>
      </header>
      {orders.length === 0 ? (
        <section className="dashboard-card">
          <h2>Henüz sipariş yok</h2>
          <p>Sepet ve checkout akışından sipariş taslağı oluşturabilirsiniz.</p>
        </section>
      ) : (
        <section className="order-list" aria-label="Alıcı siparişleri">
          {orders.map((order) => (
            <article className="dashboard-card order-card" key={order.id}>
              <div>
                <span className="status-pill">{order.status}</span>
                <h2>{order.publicNumber}</h2>
                <p>
                  {order.supplierOrganization.tradeName} · {order._count.items} satır
                </p>
              </div>
              <div>
                <strong>{formatTryMinor(order.totalAmountMinor)}</strong>
                <p>Ödeme: {order.payments[0]?.status ?? "BAŞLATILMADI"}</p>
                <Link href={`/panel/siparisler/${order.id}`}>Sipariş detayını aç</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
