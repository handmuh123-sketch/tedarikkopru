import { notFound } from "next/navigation";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { BankTransferDecisionForm } from "@/components/payments/bank-transfer-decision-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";

const adminRoles = ["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_OPERATIONS", "PLATFORM_SUPPORT"];
const operatorRoles = ["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_OPERATIONS"];
type Props = { params: Promise<{ paymentId: string }> };
export const dynamic = "force-dynamic";

export default async function AdminPaymentDetailPage({ params }: Props) {
  const { paymentId } = await params;
  const { user } = await requirePageUser();
  if (!adminRoles.includes(user.platformRole)) notFound();
  const payment = await database.payment.findFirst({
    where: { id: paymentId, provider: "BANK_TRANSFER" },
    include: { order: { select: { publicNumber: true, status: true } }, buyerOrganization: { select: { tradeName: true } }, attempts: { orderBy: { createdAt: "asc" } } },
  });
  if (!payment) notFound();
  return <main id="ana-icerik" className="dashboard-page order-detail" tabIndex={-1}>
    <header className="dashboard-header"><div><p className="eyebrow">Banka transferi</p><h1>{payment.order.publicNumber}</h1><p>{payment.buyerOrganization.tradeName}</p></div><AdminNavigation platformRole={user.platformRole} /></header>
    <section className="dashboard-grid"><article className="dashboard-card"><span className="status-pill">{payment.status}</span><h2>Ödeme özeti</h2><p>Tutar: {formatTryMinor(payment.amountMinor)}</p><p>Referans: {payment.bankTransferReference}</p><p>Not: {payment.bankTransferNote ?? "Not eklenmedi."}</p></article><article className="dashboard-card"><BankTransferDecisionForm paymentId={payment.id} status={payment.status} canDecide={operatorRoles.includes(user.platformRole)} /></article></section>
    <section className="dashboard-card"><h2>Ödeme geçmişi</h2><ol className="status-history"><li><strong>PENDING</strong><span>Transfer bildirimi oluşturuldu · {payment.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</span></li>{payment.attempts.map((attempt) => <li key={attempt.id}><strong>{attempt.outcome}</strong><span>{attempt.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</span></li>)}</ol></section>
  </main>;
}
