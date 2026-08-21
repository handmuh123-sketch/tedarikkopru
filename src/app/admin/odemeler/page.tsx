import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const adminRoles = ["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_OPERATIONS", "PLATFORM_SUPPORT"];

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const payments = await database.payment.findMany({
    where: { provider: "BANK_TRANSFER" },
    include: { order: { select: { publicNumber: true } }, buyerOrganization: { select: { tradeName: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header"><div><p className="eyebrow">Operasyon</p><h1>Banka transferi kuyruğu</h1></div></header>
      {payments.length === 0 ? <p className="form-status">Bekleyen banka transferi yok.</p> : <section className="order-list" aria-label="Banka transferleri">
        {payments.map((payment) => <article className="dashboard-card order-card" key={payment.id}>
          <div><span className="status-pill">{payment.status}</span><h2>{payment.order.publicNumber}</h2><p>{payment.buyerOrganization.tradeName}</p></div>
          <div><strong>{formatTryMinor(payment.amountMinor)}</strong><p>Referans: {payment.bankTransferReference}</p><Link href={`/admin/odemeler/${payment.id}`}>Ödeme detayını aç</Link></div>
        </article>)}
      </section>}
    </main>
  );
}
