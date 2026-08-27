export type WorkspaceArea = "buyer" | "supplier" | "admin";

export type NavigationItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "products"
    | "favorites"
    | "orders"
    | "marketplace"
    | "business"
    | "stock"
    | "import"
    | "check"
    | "catalog"
    | "system"
    | "payments"
    | "quotes"
    | "returns";
};

type NavigationInput = {
  area: WorkspaceArea;
  platformRole: string;
};

const catalogRoles = new Set(["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"]);

export function workspaceNavigation({ area, platformRole }: NavigationInput): {
  primary: NavigationItem[];
  secondary: NavigationItem[];
} {
  if (area === "supplier") {
    return {
      primary: [
        { href: "/panel", label: "Ana sayfa", icon: "home" },
        { href: "/tedarikci/urunler", label: "Ürünlerim", icon: "products" },
        { href: "/tedarikci/stok", label: "Stok", icon: "stock" },
        { href: "/tedarikci/siparisler", label: "Siparişler", icon: "orders" },
        { href: "/tedarikci/import", label: "İçe / dışa aktarım", icon: "import" },
        { href: "/panel/isletmem", label: "İşletmem", icon: "business" },
      ],
      secondary: [
        { href: "/tedarikci/teklifler", label: "Gelen teklifler", icon: "quotes" },
        { href: "/tedarikci/iadeler", label: "İade talepleri", icon: "returns" },
      ],
    };
  }

  if (area === "admin") {
    const operationsRoles = new Set([
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "PLATFORM_OPERATIONS",
      "PLATFORM_SUPPORT",
    ]);
    const canViewOperations = operationsRoles.has(platformRole);
    const primary: NavigationItem[] = [
      { href: "/admin", label: "Yönetim ana sayfası", icon: "home" },
      ...(canViewOperations
        ? [{ href: "/admin/dogrulamalar", label: "Doğrulamalar", icon: "check" as const }]
        : []),
      ...(catalogRoles.has(platformRole)
        ? [{ href: "/admin/urunler", label: "Ürünler", icon: "catalog" as const }]
        : []),
      ...(catalogRoles.has(platformRole)
        ? [
            {
              href: "/admin/entegrasyonlar/trendyol",
              label: "Pazaryeri eşleştirmeleri",
              icon: "marketplace" as const,
            },
          ]
        : []),
      ...(catalogRoles.has(platformRole)
        ? [{ href: "/admin/importlar", label: "Importlar", icon: "import" as const }]
        : []),
      ...(canViewOperations
        ? [{ href: "/admin/operasyonlar", label: "Sistem durumu", icon: "system" as const }]
        : []),
    ];
    return {
      primary,
      secondary: [
        ...(canViewOperations
          ? [{ href: "/admin/odemeler", label: "Ödemeler", icon: "payments" as const }]
          : []),
        { href: "/panel", label: "İşletme paneli", icon: "business" },
      ],
    };
  }

  return {
    primary: [
      { href: "/panel", label: "Ana sayfa", icon: "home" },
      { href: "/urunler", label: "Ürünler", icon: "products" },
      { href: "/panel/favoriler", label: "Favorilerim", icon: "favorites" },
      { href: "/panel/siparisler", label: "Siparişlerim", icon: "orders" },
      { href: "/panel/entegrasyonlar", label: "Pazaryeri entegrasyonları", icon: "marketplace" },
      { href: "/panel/isletmem", label: "İşletmem", icon: "business" },
    ],
    secondary: [
      { href: "/panel/teklif-talepleri", label: "Teklif taleplerim", icon: "quotes" },
      { href: "/panel/sepet", label: "Sepetim", icon: "orders" },
      { href: "/oturumlar", label: "Hesap ayarları", icon: "business" },
    ],
  };
}
