import { redirect } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { VerificationQueue } from "@/components/admin/verification-queue";
import { requirePageUser } from "@/lib/auth/page-session";
export default async function AdminVerificationPage() {
  const { user } = await requirePageUser();
  if (
    !["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_OPERATIONS", "PLATFORM_SUPPORT"].includes(
      user.platformRole,
    )
  )
    redirect("/panel");
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Platform yönetimi</p>
          <h1>Şirket doğrulama kuyruğu</h1>
        </div>
        <AdminNavigation platformRole={user.platformRole} />
      </header>
      <VerificationQueue
        canOperate={["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_OPERATIONS"].includes(
          user.platformRole,
        )}
      />
    </main>
  );
}
