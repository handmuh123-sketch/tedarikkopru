# ÜRÜN KARARLARI — DECISIONS.md

Bu dosya varsayılan kararları dondurur. Gerçek kullanıcı görüşmeleri yeni bilgi sağlarsa karar güncellenebilir; eski karar ve gerekçe geçmişten silinmez.

## D-001 — Ürün tipi

Türkiye odaklı, doğrulanmış işletmeler arasında çalışan B2B tedarikçi pazaryeri.

## D-002 — İlk kullanıcılar

- Tedarikçi: toptancı, üretici, distribütör.
- Alıcı: Trendyol, Hepsiburada, Amazon, n11, kendi sitesi veya sosyal ticarette satış yapan işletme.
- Bireysel tüketici hesabı Pilot MVP kapsamı dışında.

## D-003 — İlk kategori

Kod ve veri modeli kategori bağımsızdır. Demo ve pilot örnek verisi **telefon/mobil aksesuarları** kullanır. Canlı pilot kategorisi, tedarikçi görüşmeleri sonrası değiştirilebilir.

## D-004 — İlk lojistik modeli

Tedarikçi ürünü alıcı işletmenin teslimat adresine gönderir. Platform deposu/WMS ve son müşteriye dropshipping başlangıçta kapalıdır.

## D-005 — İlk ödeme modeli

Pilot MVP'de mock ödeme ve manuel banka transferi doğrulama akışı kullanılabilir. Platform kendi hesabında satıcı parasını emanet tutan lisanssız yapı kurmaz. Canlı kartlı ödeme yalnız lisanslı pazaryeri ödeme sağlayıcısı sözleşmesi sonrası açılır.

## D-006 — Sepet

Pilot MVP'de tek sepet = tek tedarikçi. Çoklu tedarikçi checkout kapsam dışı.

## D-007 — Entegrasyonlar

Pilot MVP:
- CSV/XLSX import-export,
- manuel kargo takibi,
- mock ödeme,
- e-posta geliştirme adaptörü.

Sonraki:
- canlı ödeme,
- Trendyol Product V2 ve sipariş,
- Hepsiburada,
- Amazon SP-API,
- gerçek kargo,
- e-belge.

## D-008 — Teknik yaklaşım

- responsive web,
- modüler monolit,
- Next.js App Router + TypeScript,
- PostgreSQL,
- Prisma,
- güncel ve birbiriyle uyumlu kararlı sürümler,
- Docker geliştirme ortamı,
- mock-first harici servis adaptörleri.

## D-009 — Canlıya çıkış kapıları

Canlıya çıkmadan:
- hukuk incelemesi,
- KVKK veri envanteri,
- mali müşavir/vergi akışı,
- lisanslı ödeme sağlayıcısı,
- güvenlik testi,
- yedek geri yükleme testi,
- admin 2FA,
- production secret yönetimi
tamamlanmalıdır.
