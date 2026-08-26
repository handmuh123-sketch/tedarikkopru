"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/auth-forms";
import {
  workspaceNavigation,
  type NavigationItem,
  type WorkspaceArea,
} from "@/components/navigation/navigation-model";

type Membership = {
  id: string;
  tradeName: string;
  type: string;
  role: string;
  verificationStatus: string;
};

type Props = {
  area: WorkspaceArea;
  userName: string;
  platformRole: string;
  memberships: Membership[];
};

function Icon({ name }: { name: NavigationItem["icon"] }) {
  const paths: Record<NavigationItem["icon"], string> = {
    home: "M3 10.5 12 3l9 7.5v9.75a.75.75 0 0 1-.75.75H15v-6H9v6H3.75a.75.75 0 0 1-.75-.75v-9.75Z",
    products: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm8 13.5v-9.75M4 7.5l8 4.5 8-4.5",
    favorites:
      "m12 20-1.2-1.1C5.4 14 2 10.9 2 7.1 2 4.5 4 2.5 6.6 2.5c1.5 0 3 0.7 3.9 1.9.9-1.2 2.4-1.9 3.9-1.9C17 2.5 19 4.5 19 7.1c0 3.8-3.4 6.9-8.8 11.8L9 20h3Z",
    orders: "M5 4h14v17H5V4Zm3 4h8M8 12h8M8 16h5",
    marketplace: "M4 5h16l-1 5H5L4 5Zm2 5v10h12V10M9 20v-6h6v6",
    business:
      "M4 21V5l8-3 8 3v16M8 8h.01M8 12h.01M8 16h.01M12 8h.01M12 12h.01M12 16h.01M16 8h.01M16 12h.01M16 16h.01",
    stock: "M4 7h16M6 7v13h12V7M9 11h6M9 15h6M8 3h8v4H8V3Z",
    import: "M12 3v12m0 0 4-4m-4 4-4-4M5 19h14",
    check: "M5 3h14v18H5V3Zm4 9 2 2 4-5",
    catalog: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm2.5 9.5H20",
    system:
      "M12 3v3m0 12v3m9-9h-3M6 12H3m15.4-6.4-2.1 2.1M7.7 16.3l-2.1 2.1m12.8 0-2.1-2.1M7.7 7.7 5.6 5.6M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    payments: "M4 6h16v12H4V6Zm0 4h16M7 15h3",
    quotes: "M5 4h14v12H9l-4 4V4Zm4 5h6",
    returns: "M8 7 4 11l4 4M4 11h10a4 4 0 0 1 4 4v2",
  };
  return (
    <svg aria-hidden="true" className="workspace-nav-icon" viewBox="0 0 24 24">
      <path
        d={paths[name]}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/panel" || href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ items, pathname }: { items: NavigationItem[]; pathname: string }) {
  return (
    <ul className="workspace-nav-list">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            className={isActive(pathname, item.href) ? "is-active" : undefined}
            href={item.href}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function WorkspaceNavigation({ area, userName, platformRole, memberships }: Props) {
  const pathname = usePathname();
  const navigation = workspaceNavigation({ area, platformRole });
  const areaLabel = area === "admin" ? "Platform yönetimi" : "İşletme menüsü";
  const firstMembership = memberships[0];

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar-desktop">
        <Link className="brand workspace-brand" href="/panel">
          <span className="brand-mark" aria-hidden="true">
            TK
          </span>
          <span>TedarikKöprü</span>
        </Link>
        <p className="workspace-area-label">{area === "admin" ? "Yönetim" : "İşletme alanı"}</p>
        <nav aria-label={areaLabel}>
          <NavigationLinks items={navigation.primary} pathname={pathname} />
        </nav>
        <details className="workspace-more" open={navigation.secondary.length > 0}>
          <summary>Diğer işlemler</summary>
          <NavigationLinks items={navigation.secondary} pathname={pathname} />
        </details>
        {area !== "admin" ? (
          <details className="workspace-context" open>
            <summary>
              <span>İşletme erişimi</span>
              <strong>{firstMembership ? firstMembership.tradeName : "İşletme oluşturun"}</strong>
            </summary>
            <ul>
              {memberships.length > 0 ? (
                memberships.map((membership) => (
                  <li key={membership.id}>
                    <strong>{membership.tradeName}</strong>
                    <span>
                      {membership.type} · {membership.role} · {membership.verificationStatus}
                    </span>
                  </li>
                ))
              ) : (
                <li>
                  <span>İşletme bağlamı eklemek için onboarding akışını başlatın.</span>
                </li>
              )}
            </ul>
          </details>
        ) : null}
        <div className="workspace-user">
          <span>{userName}</span>
          <SignOutButton />
        </div>
      </div>

      <details className="workspace-mobile-menu">
        <summary>
          <span className="brand-mark" aria-hidden="true">
            TK
          </span>
          <span>Menü</span>
        </summary>
        <nav aria-label={`${areaLabel} mobil`}>
          <NavigationLinks items={navigation.primary} pathname={pathname} />
          <NavigationLinks items={navigation.secondary} pathname={pathname} />
        </nav>
        <div className="workspace-mobile-actions">
          <Link href="/panel/isletmem">İşletme ve adresler</Link>
          <Link href="/oturumlar">Hesap ayarları</Link>
          <SignOutButton />
        </div>
      </details>
    </aside>
  );
}
