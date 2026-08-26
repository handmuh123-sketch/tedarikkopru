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
type Props = { params: Promise<{ returnId: string }> };

export const dynamic = "force-dynamic";

export default async function AdminReturnDetailPage({ params }: Props) {
  const { returnId } = await params;
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const returnRequest = await database.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      order: { select: { id: true, publicNumber: true } },
      buyerOrganization: { select: { tradeName: true } },
      supplierOrganization: { select: { tradeName: true } },
      items: {
        include: {
          orderItem: { select: { productTitleSnapshot: true, variantTitleSnapshot: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      refund: {
        include: { items: { include: { orderItem: { select: { productTitleSnapshot: true } } } } },
      },
    },
  });
  if (!returnRequest) notFound();
  return (
    <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform iade operasyonu</p>
          <h1>{returnRequest.order.publicNumber}</h1>
          <p>
            {returnRequest.buyerOrganization.tradeName} →{" "}
            {returnRequest.supplierOrganization.tradeName}
          </p>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span className="status-pill">{returnRequest.status}</span>
          <h2>İade özeti</h2>
          <p>Neden: {returnRequest.reason}</p>
          <p>
            Oluşturulma:{" "}
            {returnRequest.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
          </p>
        </article>
        <article className="dashboard-card">
          <h2>Refund</h2>
          {returnRequest.refund ? (
            <p>
              {returnRequest.refund.status} ·{" "}
              <strong>{formatTryMinor(returnRequest.refund.amountMinor)}</strong>
            </p>
          ) : (
            <p>Refund kaydı yok.</p>
          )}
        </article>
      </section>
      <section className="dashboard-card">
        <h2>İade satırları</h2>
        <ul>
          {returnRequest.items.map((item) => (
            <li key={item.id}>
              {item.orderItem.productTitleSnapshot} · {item.orderItem.variantTitleSnapshot} ·{" "}
              {item.quantity} adet
            </li>
          ))}
        </ul>
      </section>
      {returnRequest.refund && (
        <section className="dashboard-card">
          <h2>Refund satırları</h2>
          <ul>
            {returnRequest.refund.items.map((item) => (
              <li key={item.id}>
                {item.orderItem.productTitleSnapshot} · {item.quantity} adet ·{" "}
                {formatTryMinor(item.amountMinor)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="dashboard-card">
        <h2>İade durum geçmişi</h2>
        <ol className="status-history">
          {returnRequest.statusHistory.map((entry) => (
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
      <Link
        className="button button-secondary"
        href={`/admin/siparisler/${returnRequest.order.id}`}
      >
        Siparişe dön
      </Link>
    </main>
  );
}
