import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TedarikKöprü | İşletmeler arası tedarik",
  description: "Doğrulanmış işletmeleri güvenli tedarik süreçlerinde buluşturan B2B platformu.",
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
