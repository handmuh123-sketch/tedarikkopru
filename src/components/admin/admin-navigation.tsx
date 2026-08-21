import Link from "next/link";

import type { PlatformRole } from "@/generated/prisma/enums";

const catalogRoles = new Set<PlatformRole>(["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"]);

export function AdminNavigation({ platformRole }: { platformRole: PlatformRole }) {
  return (
    <nav className="dashboard-actions" aria-label="Platform yönetimi">
      <Link className="button button-secondary" href="/admin/operasyonlar">
        Operasyonlar
      </Link>
      <Link className="button button-secondary" href="/admin/dogrulamalar">
        Doğrulamalar
      </Link>
      <Link className="button button-secondary" href="/admin/odemeler">
        Ödemeler
      </Link>
      {catalogRoles.has(platformRole) && (
        <>
          <Link className="button button-secondary" href="/admin/urunler">
            Ürünler
          </Link>
          <Link className="button button-secondary" href="/admin/importlar">
            Importlar
          </Link>
        </>
      )}
      <Link className="button button-secondary" href="/panel">
        Panele dön
      </Link>
    </nav>
  );
}
