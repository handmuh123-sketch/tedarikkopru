import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

export default async function AdminImportsPage() {
  const { user } = await requirePageUser();
  if (!["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.platformRole)) redirect("/panel");
  const jobs = await database.importJob.findMany({
    include: {
      organization: { select: { tradeName: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const dateTime = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform yönetimi</p>
          <h1>Import işleri</h1>
        </div>
        <Link className="button button-secondary" href="/panel">
          Panele dön
        </Link>
      </header>
      {jobs.length === 0 && <p>Henüz import işi yok.</p>}
      <div className="table-scroll">
        <table>
          <caption>Son 100 ürün import işi</caption>
          <thead>
            <tr>
              <th>İşletme</th>
              <th>Oluşturan</th>
              <th>Biçim</th>
              <th>Durum</th>
              <th>Satırlar</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.organization.tradeName}</td>
                <td>{job.createdBy.name}</td>
                <td>{job.fileType.toUpperCase()}</td>
                <td>
                  <span className="status-pill">{job.status}</span>
                </td>
                <td>
                  {job.validRows} geçerli / {job.invalidRows} hatalı
                </td>
                <td>{dateTime.format(job.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
