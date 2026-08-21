import Link from "next/link";

import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const buyerRfqRoles = ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"] as const;

export const dynamic = "force-dynamic";

export default async function BuyerRfqsPage() {
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: [...buyerRfqRoles] },
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
        <h1>Teklif talepleri kullanılamıyor</h1>
      </main>
    );
  }
  const rfqs = await database.requestForQuote.findMany({
    where: { buyerOrganizationId: membership.organizationId },
    include: {
      supplierOrganization: { select: { tradeName: true } },
      product: { select: { title: true } },
      variant: { select: { title: true } },
      quotes: {
        select: { id: true, status: true, unitPriceAmountMinor: true, validUntil: true },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{membership.organization.tradeName}</p>
          <h1>Teklif taleplerim</h1>
        </div>
        <Link className="button button-secondary" href="/panel">
          Panele dön
        </Link>
      </header>
      {rfqs.length === 0 ? (
        <section className="dashboard-card">
          <h2>Henüz teklif talebi yok</h2>
          <p>Ürün detayından hedef tedarikçiye teklif talebi gönderebilirsiniz.</p>
        </section>
      ) : (
        <section className="order-list" aria-label="Alıcı teklif talepleri">
          {rfqs.map((rfq) => {
            const quote = rfq.quotes[0];
            return (
              <article className="dashboard-card order-card" key={rfq.id}>
                <div>
                  <span className="status-pill">{rfq.status}</span>
                  <h2>{rfq.product.title}</h2>
                  <p>
                    {rfq.variant.title} · {rfq.targetQuantity} adet ·{" "}
                    {rfq.supplierOrganization.tradeName}
                  </p>
                </div>
                <div>
                  {quote ? (
                    <p>
                      Teklif: <strong>{formatTryMinor(quote.unitPriceAmountMinor)}</strong> ·{" "}
                      {quote.status}
                    </p>
                  ) : (
                    <p>Teklif bekleniyor</p>
                  )}
                  <Link href={`/panel/teklif-talepleri/${rfq.id}`}>Talep detayını aç</Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
