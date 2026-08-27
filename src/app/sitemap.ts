import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://tedarikkopru.onrender.com";

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/urunler`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/giris`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/kayit`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}