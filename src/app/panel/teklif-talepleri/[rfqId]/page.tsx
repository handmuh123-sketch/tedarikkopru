import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyerQuoteDecisionForm } from "@/components/rfq/buyer-quote-decision-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const buyerRfqRoles = ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"] as const;

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ rfqId: string }> };

export default async function BuyerRfqDetailPage({ params }: Props) {
  const { rfqId } = await params;
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
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) notFound();
  const rfq = await database.requestForQuote.findFirst({
    where: { id: rfqId, buyerOrganizationId: membership.organizationId },
    include: {
      supplierOrganization: { select: { tradeName: true } },
      product: { select: { title: true, slug: true } },
      variant: { select: { title: true, sku: true } },
      quotes: {
        include: { statusHistory: { orderBy: { createdAt: "asc" } } },
        take: 1,
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!rfq) notFound();
  const quote = rfq.quotes[0] ?? null;
  return (
    <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Alıcı teklif talebi</p>
          <h1>{rfq.product.title}</h1>
          <p>{rfq.supplierOrganization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/panel/teklif-talepleri">
          Taleplere dön
        </Link>
      </header>
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span className="status-pill">{rfq.status}</span>
          <h2>Talep özeti</h2>
          <p>Varyant: {rfq.variant.title}</p>
          <p>SKU: {rfq.variant.sku}</p>
          <p>Talep miktarı: {rfq.targetQuantity} adet</p>
          <p>
            Oluşturulma: {rfq.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
          </p>
        </article>
        <article className="dashboard-card">
          <h2>Alıcı notu</h2>
          <p>{rfq.buyerNote ?? "Not eklenmedi."}</p>
        </article>
      </section>
      {quote ? (
        <section className="dashboard-card">
          <span className="status-pill">{quote.status}</span>
          <h2>Alınan teklif</h2>
          <p>
            Birim fiyat: <strong>{formatTryMinor(quote.unitPriceAmountMinor)}</strong>
          </p>
          <p>
            Geçerlilik:{" "}
            {quote.validUntil.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
          </p>
          <p>Tedarikçi notu: {quote.supplierNote ?? "Not eklenmedi."}</p>
          {rfq.status === "QUOTED" && quote.status === "OFFERED" ? (
            <BuyerQuoteDecisionForm
              organizationId={membership.organizationId}
              rfqId={rfq.id}
              quoteId={quote.id}
            />
          ) : rfq.status === "ACCEPTED" ? (
            <p className="form-status success">
              Teklif kabul edildi.{" "}
              <Link href={`/urunler/${rfq.product.slug}`}>Ürünü sepete ekle</Link>
            </p>
          ) : (
            <p className="form-status">Bu teklif için karar kaydedildi: {quote.status}.</p>
          )}
          <h3>Teklif durum geçmişi</h3>
          <ol className="status-history">
            {quote.statusHistory.map((entry) => (
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
      ) : (
        <section className="dashboard-card">
          <h2>Teklif bekleniyor</h2>
          <p>Hedef tedarikçi teklif verdiğinde burada görünür.</p>
        </section>
      )}
      <section className="dashboard-card">
        <h2>Talep durum geçmişi</h2>
        <ol className="status-history">
          {rfq.statusHistory.map((entry) => (
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
