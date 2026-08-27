import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/urunler", "/urunler/", "/giris", "/kayit"],
        disallow: ["/panel/", "/admin/", "/tedarikci/", "/api/", "/onboarding"],
      },
    ],
    sitemap: "https://tedarikkopru.onrender.com/sitemap.xml",
  };
}
