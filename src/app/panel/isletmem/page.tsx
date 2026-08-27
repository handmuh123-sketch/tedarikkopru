import Link from "next/link";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

function statusPresentation(status: string) {
  if (status === "APPROVED") return { label: "Onaylandı", tone: "approved" as const };
  if (["SUBMITTED", "IN_REVIEW"].includes(status))
    return { label: "İncelemede", tone: "review" as const };
  if (status === "NEEDS_CHANGES") return { label: "Eksik bilgi", tone: "missing" as const };
  return { label: "Kurulum gerekli", tone: "missing" as const };
}

export default async function BusinessPage() {
  const { user } = await requirePageUser();
  const memberships = await database.organizationMembership.findMany({
    where: { userId: user.id, status: "ACTIVE", organization: { status: { not: "ARCHIVED" } } },
    select: {
      id: true,
      role: true,
      organization: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          type: true,
          verificationStatus: true,
          _count: { select: { addresses: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <Breadcrumbs items={[{ href: "/panel", label: "Ana sayfa" }, { label: "İşletmem" }]} />
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">İşletme ayarları</p>
          <h1>İşletmem ve adresler</h1>
          <p>Doğrulama durumunu, erişim rolünüzü ve kayıtlı adresleri burada takip edin.</p>
        </div>
        <Link className="button button-primary" href="/onboarding">
          Yeni işletme oluştur
        </Link>
      </header>
      {memberships.length === 0 ? (
        <section className="empty-state">
          <h2>Henüz işletmeniz yok</h2>
          <p>Alım, tedarik veya pazaryeri işlemlerine başlamak için işletmenizi oluşturun.</p>
          <Link className="button button-primary" href="/onboarding">
            İşletme oluştur
          </Link>
        </section>
      ) : (
        <section className="dashboard-grid" aria-label="İşletmeleriniz">
          {memberships.map(({ organization, role }) => {
            const status = statusPresentation(organization.verificationStatus);
            const resumable = ["DRAFT", "NEEDS_CHANGES"].includes(organization.verificationStatus);
            return (
              <article className="dashboard-card business-card" key={organization.id}>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                <h2>{organization.tradeName}</h2>
                <p>{organization.legalName}</p>
                <dl>
                  <div>
                    <dt>İşletme türü</dt>
                    <dd>{organization.type}</dd>
                  </div>
                  <div>
                    <dt>Rolünüz</dt>
                    <dd>{role}</dd>
                  </div>
                  <div>
                    <dt>Adresler</dt>
                    <dd>{organization._count.addresses} kayıtlı</dd>
                  </div>
                </dl>
                {resumable && ["OWNER", "ORG_ADMIN"].includes(role) ? (
                  <Link
                    className="button button-secondary"
                    href={`/onboarding?organizationId=${organization.id}`}
                  >
                    Başvuruyu tamamla
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
