import Link from "next/link";

import type { PlatformRole } from "@/generated/prisma/enums";

export function AdminNavigation({ platformRole }: { platformRole: PlatformRole }) {
  return (
    <div className="page-header-actions">
      <Link className="button button-secondary" href="/admin">
        Yönetim ana sayfası
      </Link>
      {platformRole === "PLATFORM_SUPPORT" ? (
        <Link className="button button-secondary" href="/panel">
          İşletme paneli
        </Link>
      ) : null}
    </div>
  );
}
