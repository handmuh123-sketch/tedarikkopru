import Link from "next/link";
import { notFound } from "next/navigation";

import { SupplierOrderDecisionForm } from "@/components/orders/supplier-order-decision-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const supplierOrderRoles = ["OWNER", "ORG_ADMIN", "WAREHOUSE_OPERATOR"] as const;

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
    value.phone,
  ].filter((part): part is string => typeof part === "string" && part.length > 0);
}

export const dynamic = "force-dynamic";

export default async function SupplierOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
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
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) notFound();
  const order = await database.order.findFirst({
    where: { id: orderId, supplierOrganizationId: membership.organizationId },
    include: {
      buyerOrganization: { select: { tradeName: true } },
      items: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  return (
    <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi siparişi</p>
          <h1>{order.publicNumber}</h1>
          <p>{order.buyerOrganization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/tedarikci/siparisler">
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
      {order.status === "PAID" ? (
        <section className="dashboard-card">
          <SupplierOrderDecisionForm
            organizationId={membership.organizationId}
            orderId={order.id}
          />
        </section>
      ) : (
        <section className="dashboard-card">
          <h2>Sipariş kararı</h2>
          <p>Bu sipariş için tedarikçi kararı zaten kaydedildi: {order.status}.</p>
          {order.status === "REJECTED" && (
            <p className="form-status error">
              Stok ve rezervasyon kayıtları ödeme sonrası immutable kalır; iade süreci bu pilotta
              yoktur.
            </p>
          )}
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
