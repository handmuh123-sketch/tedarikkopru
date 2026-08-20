import Link from "next/link";
import { notFound } from "next/navigation";

import { MockPaymentForm } from "@/components/payments/mock-payment-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import { releaseExpiredReservations } from "@/modules/orders/application/order-service";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ orderId: string }> };

function addressLines(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const value = snapshot as Record<string, unknown>;
  return [
    value.title,
    value.contactName,
    value.line1,
    value.line2,
    value.district,
    value.city,
  ].filter((part): part is string => typeof part === "string" && part.length > 0);
}

export default async function BuyerOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
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
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) notFound();
  const order = await database.order.findFirst({
    where: { id: orderId, buyerOrganizationId: membership.organizationId },
    include: {
      supplierOrganization: { select: { tradeName: true } },
      items: { orderBy: { createdAt: "asc" } },
      payments: { include: { attempts: true }, take: 1 },
      statusHistory: { orderBy: { createdAt: "asc" } },
      checkout: { select: { expiresAt: true } },
      shipment: { include: { statusHistory: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!order) notFound();
  const payment = order.payments[0] ?? null;
  return (
    <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Alıcı siparişi</p>
          <h1>{order.publicNumber}</h1>
          <p>{order.supplierOrganization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/panel/siparisler">
          Siparişlere dön
        </Link>
      </header>
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span className="status-pill">{order.status}</span>
          <h2>Sipariş özeti</h2>
          <p>Ara toplam: {formatTryMinor(order.subtotalAmountMinor)}</p>
          <p>KDV: {formatTryMinor(order.vatAmountMinor)}</p>
          <p>
            <strong>Genel toplam: {formatTryMinor(order.totalAmountMinor)}</strong>
          </p>
          <p>
            Rezervasyon sonu:{" "}
            {order.checkout.expiresAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
          </p>
        </article>
        <article className="dashboard-card">
          <h2>Teslimat adresi</h2>
          <address>
            {addressLines(order.deliveryAddressSnapshot).map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </address>
          <h2>Fatura adresi</h2>
          <address>
            {addressLines(order.invoiceAddressSnapshot).map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </address>
        </article>
      </section>
      <section className="dashboard-card">
        <h2>Sipariş satırları</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>SKU</th>
                <th>Adet</th>
                <th>Birim fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productTitleSnapshot} · {item.variantTitleSnapshot}
                  </td>
                  <td>{item.skuSnapshot}</td>
                  <td>{item.quantity}</td>
                  <td>{formatTryMinor(item.unitPriceAmountMinor)}</td>
                  <td>{formatTryMinor(item.totalAmountMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {order.status === "DRAFT" || order.status === "PAYMENT_PROCESSING" ? (
        <section className="dashboard-card">
          <MockPaymentForm
            organizationId={membership.organizationId}
            orderId={order.id}
            initialPayment={payment ? { id: payment.id, status: payment.status } : null}
          />
        </section>
      ) : (
        <section className="dashboard-card">
          <h2>Ödeme durumu</h2>
          <span className="status-pill">{payment?.status ?? "YOK"}</span>
          {order.status === "ACCEPTED" && (
            <p className="form-status success">Tedarikçi siparişinizi kabul etti.</p>
          )}
          {order.status === "SHIPPED" && (
            <p className="form-status success">Siparişiniz kargoya verildi.</p>
          )}
          {order.status === "DELIVERED" && (
            <p className="form-status success">Siparişiniz teslim edildi.</p>
          )}
          {order.status === "REJECTED" && (
            <p className="form-status error">
              Tedarikçi siparişi reddetti. Ödeme iadesi ve iade işlemleri henüz pilot kapsamı
              dışındadır.
            </p>
          )}
        </section>
      )}
      {order.shipment && (
        <section className="dashboard-card">
          <h2>Kargo bilgileri</h2>
          <span className="status-pill">{order.shipment.status}</span>
          <p>Kargo firması: {order.shipment.carrier}</p>
          <p>Takip numarası: {order.shipment.trackingNumber}</p>
          <p>
            Kargoya verilme: {" "}
            {order.shipment.shippedAt.toLocaleDateString("tr-TR", {
              timeZone: "Europe/Istanbul",
            })}
          </p>
          {order.shipment.estimatedDeliveryAt && (
            <p>
              Tahmini teslim: {" "}
              {order.shipment.estimatedDeliveryAt.toLocaleDateString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })}
            </p>
          )}
          {order.shipment.deliveredAt && (
            <p>
              Teslim edildi: {" "}
              {order.shipment.deliveredAt.toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })}
            </p>
          )}
          <h3>Kargo durum geçmişi</h3>
          <ol className="status-history">
            {order.shipment.statusHistory.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.toStatus}</strong>
                <span>
                  {entry.reasonCode} · {" "}
                  {entry.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="dashboard-card">
        <h2>Durum geçmişi</h2>
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
    </main>
  );
}
