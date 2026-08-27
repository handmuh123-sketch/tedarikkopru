import { describe, expect, it } from "vitest";

import { workspaceNavigation } from "@/components/navigation/navigation-model";

describe("UX-1 workspace navigation", () => {
  it("alıcı menüsünde yalnız alıcı işlemlerini gösterir", () => {
    const navigation = workspaceNavigation({ area: "buyer", platformRole: "USER" });

    expect(navigation.primary.map(({ href }) => href)).toEqual([
      "/panel",
      "/panel/firsatlar",
      "/urunler",
      "/panel/favoriler",
      "/panel/siparisler",
      "/panel/entegrasyonlar",
      "/panel/isletmem",
    ]);
    expect(navigation.primary.some(({ href }) => href.startsWith("/admin"))).toBe(false);
  });

  it("tedarikçi menüsünde katalog ve stok işlemlerini gösterir", () => {
    const navigation = workspaceNavigation({ area: "supplier", platformRole: "USER" });

    expect(navigation.primary.map(({ href }) => href)).toContain("/tedarikci/urunler");
    expect(navigation.primary.map(({ href }) => href)).toContain("/tedarikci/stok");
    expect(navigation.primary.some(({ href }) => href.startsWith("/admin"))).toBe(false);
  });

  it("platform destek rolünü katalog yönetiminden ayırır", () => {
    const navigation = workspaceNavigation({ area: "admin", platformRole: "PLATFORM_SUPPORT" });

    expect(navigation.primary.map(({ href }) => href)).toContain("/admin/dogrulamalar");
    expect(navigation.primary.map(({ href }) => href)).not.toContain("/admin/urunler");
    expect(navigation.primary.map(({ href }) => href)).not.toContain(
      "/admin/entegrasyonlar/trendyol",
    );
  });

  it("platform yöneticisine katalog ve pazaryeri işlemlerini gösterir", () => {
    const navigation = workspaceNavigation({ area: "admin", platformRole: "PLATFORM_ADMIN" });

    expect(navigation.primary.map(({ href }) => href)).toEqual(
      expect.arrayContaining([
        "/admin/urunler",
        "/admin/entegrasyonlar/trendyol",
        "/admin/importlar",
      ]),
    );
  });
});
