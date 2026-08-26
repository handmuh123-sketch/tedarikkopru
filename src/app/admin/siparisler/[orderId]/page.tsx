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
type Props = { params: Promise<{ orderId: string }> };

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const order = await database.order.findUnique({
    where: { id: orderId },
    include: {
      buyerOrganization: { select: { tradeName: true } },
      supplierOrganization: { select: { tradeName: true } },
      items: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      shipment: { include: { statusHistory: { orderBy: { createdAt: "asc" } } } },
      payments: {
        select: {
          id: true,
          provider: true,
          status: true,
          amountMinor: true,
          bankTransferReference: true,
        },
      },
      returnRequests: {
        select: { id: true, status: true, refund: { select: { amountMinor: true, status: true } } },
      },
    },
  });
  if (!order) notFound();
  return (
    <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform sipariş operasyonu</p>
          <h1>{order.publicNumber}</h1>
          <p>
            {order.buyerOrganization.tradeName} → {order.supplierOrganization.tradeName}
          </p>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span className="status-pill">{order.status}</span>
          <h2>Tutar</h2>
          <p>
            Toplam: <strong>{formatTryMinor(order.totalAmountMinor)}</strong>
          </p>
          <p>
            Oluşturulma: {order.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
          </p>
        </article>
        <article className="dashboard-card">
          <h2>Ödeme</h2>
          {order.payments.length === 0 ? (
            <p>Ödeme başlatılmadı.</p>
          ) : (
            order.payments.map((payment) => (
              <p key={payment.id}>
                {payment.provider} · {payment.status} · {formatTryMinor(payment.amountMinor)}
                {payment.bankTransferReference ? " · Banka transferi" : ""}
              </p>
            ))
          )}
        </article>
      </section>
      <section className="dashboard-card">
        <h2>Sipariş satırları</h2>
        <ul>
          {order.items.map((item) => (
            <li key={item.id}>
              {item.productTitleSnapshot} · {item.quantity} adet ·{" "}
              {formatTryMinor(item.totalAmountMinor)}
            </li>
          ))}
        </ul>
      </section>
      <section className="dashboard-card">
        <h2>Kargo</h2>
        {order.shipment ? (
          <>
            <p>
              {order.shipment.status} · {order.shipment.carrier} · Takip:{" "}
              {order.shipment.trackingNumber}
            </p>
            <ol className="status-history">
              {order.shipment.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.toStatus}</strong>
                  <span>
                    {entry.reasonCode} ·{" "}
                    {entry.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p>Kargo kaydı yok.</p>
        )}
      </section>
      <section className="dashboard-card">
        <h2>İade ve refund</h2>
        {order.returnRequests.length === 0 ? (
          <p>İade kaydı yok.</p>
        ) : (
          <ul>
            {order.returnRequests.map((returnRequest) => (
              <li key={returnRequest.id}>
                {returnRequest.status} ·{" "}
                {returnRequest.refund
                  ? `${returnRequest.refund.status} ${formatTryMinor(returnRequest.refund.amountMinor)}`
                  : "Refund yok"}{" "}
                · <Link href={`/admin/iadeler/${returnRequest.id}`}>Detayı aç</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="dashboard-card">
        <h2>Sipariş durum geçmişi</h2>
        <ol className="status-history">
          {order.statusHistory.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.toStatus}</strong>
              <span>
                {entry.reasonCode} ·{" "}
                {entry.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <Link className="button button-secondary" href="/admin/operasyonlar">
        Operasyonlara dön
      </Link>
    </main>
  );
}
