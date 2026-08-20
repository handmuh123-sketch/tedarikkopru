import Link from "next/link";

import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const supplierRfqRoles = ["OWNER", "ORG_ADMIN", "CATALOG_MANAGER"] as const;

export const dynamic = "force-dynamic";

export default async function SupplierRfqsPage() {
  const { user } = await requirePageUser();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: [...supplierRfqRoles] },
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
      <main id="ana-icerik" className="dashboard-page">
        <h1>Teklif talebi yetkisi bulunamadı</h1>
        <p>Owner, işletme admini veya katalog yöneticisi rolü gerekir.</p>
      </main>
    );
  }
  const rfqs = await database.requestForQuote.findMany({
    where: { supplierOrganizationId: membership.organizationId },
    include: {
      buyerOrganization: { select: { tradeName: true } },
      product: { select: { title: true } },
      variant: { select: { title: true } },
      quotes: {
        select: { status: true, unitPriceAmountMinor: true },
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
          <p className="eyebrow">Tedarikçi operasyonu</p>
          <h1>Gelen teklif talepleri</h1>
          <p>{membership.organization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/panel">
          Panele dön
        </Link>
      </header>
      {rfqs.length === 0 ? (
        <section className="dashboard-card">
          <h2>Henüz teklif talebi yok</h2>
          <p>Alıcılar ürünleriniz için teklif talebi oluşturduğunda burada görünür.</p>
        </section>
      ) : (
        <section className="order-list" aria-label="Tedarikçi teklif talepleri">
          {rfqs.map((rfq) => {
            const quote = rfq.quotes[0];
            return (
              <article className="dashboard-card order-card" key={rfq.id}>
                <div>
                  <span className="status-pill">{rfq.status}</span>
                  <h2>{rfq.product.title}</h2>
                  <p>
                    {rfq.variant.title} · {rfq.targetQuantity} adet ·{" "}
                    {rfq.buyerOrganization.tradeName}
                  </p>
                </div>
                <div>
                  {quote ? (
                    <p>
                      Teklif: {formatTryMinor(quote.unitPriceAmountMinor)} · {quote.status}
                    </p>
                  ) : (
                    <p>Teklif bekleniyor</p>
                  )}
                  <Link href={`/tedarikci/teklifler/${rfq.id}`}>Talep detayını aç</Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
