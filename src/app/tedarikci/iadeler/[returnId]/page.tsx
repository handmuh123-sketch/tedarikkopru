import Link from "next/link";
import { notFound } from "next/navigation";

import { SupplierReturnActionForm } from "@/components/returns/supplier-return-action-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const supplierReturnRoles = ["OWNER", "ORG_ADMIN", "WAREHOUSE_OPERATOR"] as const;

type Props = { params: Promise<{ returnId: string }> };

export const dynamic = "force-dynamic";

export default async function SupplierReturnDetailPage({ params }: Props) {
  const { returnId } = await params;
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: [...supplierReturnRoles] },
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
  const returnRequest = await database.returnRequest.findFirst({
    where: { id: returnId, supplierOrganizationId: membership.organizationId },
    include: {
      order: { select: { id: true, publicNumber: true, status: true } },
      buyerOrganization: { select: { tradeName: true } },
      items: {
        include: {
          orderItem: {
            select: {
              productTitleSnapshot: true,
              variantTitleSnapshot: true,
              skuSnapshot: true,
              quantity: true,
            },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      refund: { include: { items: { include: { orderItem: { select: { skuSnapshot: true } } } } } },
    },
  });
  if (!returnRequest) notFound();
  return (
    <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi iade talebi</p>
          <h1>{returnRequest.order.publicNumber}</h1>
          <p>{returnRequest.buyerOrganization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/tedarikci/iadeler">
          İadelere dön
        </Link>
      </header>
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span className="status-pill">{returnRequest.status}</span>
          <h2>İade özeti</h2>
          <p>Neden: {returnRequest.reason}</p>
          <p>Alıcı açıklaması: {returnRequest.buyerNote ?? "Açıklama eklenmedi."}</p>
          <Link href={`/tedarikci/siparisler/${returnRequest.order.id}`}>Siparişi aç</Link>
        </article>
        <article className="dashboard-card">
          <h2>Refund kaydı</h2>
          {returnRequest.refund ? (
            <>
              <span className="status-pill">{returnRequest.refund.status}</span>
              <p>Toplam: {formatTryMinor(returnRequest.refund.amountMinor)}</p>
              {returnRequest.refund.items.map((item) => (
                <p key={item.id}>
                  {item.orderItem.skuSnapshot} · {item.quantity} adet · {formatTryMinor(item.amountMinor)}
                </p>
              ))}
            </>
          ) : (
            <p>İade kabul edildiğinde uygulama içi refund kaydı oluşur.</p>
          )}
        </article>
      </section>
      <section className="dashboard-card">
        <h2>İade satırları</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>SKU</th>
                <th>Sipariş adedi</th>
                <th>İade adedi</th>
              </tr>
            </thead>
            <tbody>
              {returnRequest.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.orderItem.productTitleSnapshot} · {item.orderItem.variantTitleSnapshot}
                  </td>
                  <td>{item.orderItem.skuSnapshot}</td>
                  <td>{item.orderItem.quantity}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="dashboard-card">
        <SupplierReturnActionForm
          organizationId={membership.organizationId}
          orderId={returnRequest.order.id}
          returnId={returnRequest.id}
          status={returnRequest.status}
        />
      </section>
      <section className="dashboard-card">
        <h2>İade durum geçmişi</h2>
        <ol className="status-history">
          {returnRequest.statusHistory.map((entry) => (
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
    </main>
  );
}
