import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";
import "@/styles/vibrant-ui.css";
import "@/styles/ux-polish.css";
import "@/styles/ux-premium.css";
import "@/styles/home-entry.css";
import "@/styles/marketplace-hub.css";
import "@/styles/showcase-luxury.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tedarikkopru.onrender.com"),
  title: {
    default: "TedarikKöprü | Toptancıdan pazaryerine B2B tedarik",
    template: "%s | TedarikKöprü",
  },
  description:
    "Doğrulanmış toptancılar ile pazaryeri satıcılarını ürün, stok, sipariş ve pazaryeri hazırlığında buluşturan B2B tedarik platformu.",
  applicationName: "TedarikKöprü",
  keywords: [
    "B2B tedarik",
    "toptancı",
    "pazaryeri satıcısı",
    "ürün kataloğu",
    "stok yönetimi",
    "pazaryeri entegrasyonu",
    "Trendyol ürün hazırlığı",
    "Hepsiburada entegrasyonu",
    "PttAVM entegrasyonu",
  ],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "TedarikKöprü",
    title: "TedarikKöprü | Toptancıdan pazaryerine B2B tedarik",
    description:
      "Ürünü keşfedin, favorilerinizi hazırlayın, stok ve siparişleri yönetin; pazaryeri hazırlığına tek panelden ilerleyin.",
  },
  twitter: {
    card: "summary",
    title: "TedarikKöprü | B2B tedarik platformu",
    description: "Toptancılar ve pazaryeri satıcıları için daha düzenli bir tedarik akışı.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#ana-icerik">
          Ana içeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
