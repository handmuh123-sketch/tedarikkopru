import Link from "next/link";

import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

const supplierReturnRoles = ["OWNER", "ORG_ADMIN", "WAREHOUSE_OPERATOR"] as const;

export const dynamic = "force-dynamic";

export default async function SupplierReturnsPage() {
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
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    return (
      <main id="ana-icerik" className="dashboard-page">
        <h1>İade yetkisi bulunamadı</h1>
        <p>Owner, işletme admini veya depo operatörü rolü gerekir.</p>
      </main>
    );
  }
  const returnRequests = await database.returnRequest.findMany({
    where: { supplierOrganizationId: membership.organizationId },
    include: {
      order: { select: { id: true, publicNumber: true } },
      buyerOrganization: { select: { tradeName: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tedarikçi operasyonu</p>
          <h1>Gelen iade talepleri</h1>
          <p>{membership.organization.tradeName}</p>
        </div>
        <Link className="button button-secondary" href="/panel">
          Panele dön
        </Link>
      </header>
      {returnRequests.length === 0 ? (
        <section className="dashboard-card">
          <h2>Henüz iade talebi yok</h2>
          <p>Alıcı teslim edilmiş bir sipariş için iade talebi açtığında burada görünür.</p>
        </section>
      ) : (
        <section className="order-list" aria-label="Gelen iade talepleri">
          {returnRequests.map((returnRequest) => (
            <article className="dashboard-card order-card" key={returnRequest.id}>
              <div>
                <span className="status-pill">{returnRequest.status}</span>
                <h2>{returnRequest.order.publicNumber}</h2>
                <p>
                  {returnRequest.buyerOrganization.tradeName} · {returnRequest._count.items} satır
                </p>
              </div>
              <div>
                <p>Neden: {returnRequest.reason}</p>
                <p>Oluşturulma: {returnRequest.createdAt.toLocaleDateString("tr-TR")}</p>
                <Link href={`/tedarikci/iadeler/${returnRequest.id}`}>İade detayını aç</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
