import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const adminRoles = [
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "PLATFORM_OPERATIONS",
  "PLATFORM_SUPPORT",
];
const orderStatuses = [
  "PAID",
  "ACCEPTED",
  "SHIPPED",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
] as const;
type Props = { searchParams: Promise<{ status?: string }> };

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const selectedStatus = orderStatuses.find((candidate) => candidate === status);
  const [orders, returns] = await Promise.all([
    database.order.findMany({
      ...(selectedStatus ? { where: { status: selectedStatus } } : {}),
      include: {
        buyerOrganization: { select: { tradeName: true } },
        supplierOrganization: { select: { tradeName: true } },
        shipment: { select: { status: true } },
        returnRequests: { select: { id: true, status: true } },
        refunds: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    database.returnRequest.findMany({
      include: {
        order: { select: { publicNumber: true } },
        buyerOrganization: { select: { tradeName: true } },
        supplierOrganization: { select: { tradeName: true } },
        refund: { select: { id: true, amountMinor: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform yönetimi</p>
          <h1>Sipariş ve iade operasyonları</h1>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      <section className="dashboard-card" aria-labelledby="admin-order-filter-title">
        <h2 id="admin-order-filter-title">Sipariş filtresi</h2>
        <div className="dashboard-actions">
          <Link className="button button-secondary" href="/admin/operasyonlar">
            Tümü
          </Link>
          {orderStatuses.map((orderStatus) => (
            <Link
              className="button button-secondary"
              href={`/admin/operasyonlar?status=${orderStatus}`}
              key={orderStatus}
            >
              {orderStatus}
            </Link>
          ))}
        </div>
      </section>
      <section className="order-list" aria-label="Platform siparişleri">
        <h2>{selectedStatus ? `${selectedStatus} siparişleri` : "Son siparişler"}</h2>
        {orders.length === 0 ? (
          <p className="form-status">Bu filtrede sipariş yok.</p>
        ) : (
          orders.map((order) => (
            <article className="dashboard-card order-card" key={order.id}>
              <div>
                <span className="status-pill">{order.status}</span>
                <h3>{order.publicNumber}</h3>
                <p>
                  {order.buyerOrganization.tradeName} → {order.supplierOrganization.tradeName}
                </p>
              </div>
              <div>
                <strong>{formatTryMinor(order.totalAmountMinor)}</strong>
                <p>
                  Kargo: {order.shipment?.status ?? "Henüz kargolanmadı"} · İade:{" "}
                  {order.returnRequests.length} · Refund: {order.refunds.length}
                </p>
                <Link href={`/admin/siparisler/${order.id}`}>Sipariş detayını aç</Link>
              </div>
            </article>
          ))
        )}
      </section>
      <section className="order-list" aria-label="Platform iade talepleri">
        <h2>Son iade talepleri</h2>
        {returns.length === 0 ? (
          <p className="form-status">İade talebi yok.</p>
        ) : (
          returns.map((returnRequest) => (
            <article className="dashboard-card order-card" key={returnRequest.id}>
              <div>
                <span className="status-pill">{returnRequest.status}</span>
                <h3>{returnRequest.order.publicNumber}</h3>
                <p>
                  {returnRequest.buyerOrganization.tradeName} →{" "}
                  {returnRequest.supplierOrganization.tradeName}
                </p>
              </div>
              <div>
                <p>
                  Refund:{" "}
                  {returnRequest.refund
                    ? `${returnRequest.refund.status} · ${formatTryMinor(returnRequest.refund.amountMinor)}`
                    : "Yok"}
                </p>
                <Link href={`/admin/iadeler/${returnRequest.id}`}>İade detayını aç</Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
