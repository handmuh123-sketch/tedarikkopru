# PROJECT STATUS

**Durum:** Faz 3A hızlı tek tedarikçili sepet ve checkout taslağı pilotu tamamlandı

**Aktif faz:** Faz 3A — Sepet, checkout taslağı ve stok rezervasyonu (Faz 3B başlatılmadı)

**Son güncelleme:** 20 Temmuz 2026, 20:10 +03:00

## Tamamlananlar

- Alıcı organizasyonu başına tek sepet ve tek tedarikçi kuralı UI + org-scoped API tarafında tamamlandı; ürün ekleme, miktar güncelleme ve silme MOQ/quantity-step doğrulamasıyla çalışır.
- `Cart`, `CartItem`, `Checkout`, `StockReservation`, `Order` ve immutable `OrderItem` snapshot modelleri forward migration ile eklendi; tedarikçi minimum sipariş tutarı integer minor unit olarak saklanır.
- Kullanılabilir stok hesabı `onHand - reserved - safetyStock` oldu. 15 dakikalık rezervasyon PostgreSQL koşullu UPDATE ve serializable transaction ile atomik claim edilir; expiry/manual release sayaç, append-only movement ve audit'i birlikte günceller.
- Checkout create `Idempotency-Key` ister; aynı key + aynı adres isteği aynı checkout/sipariş sonucunu, farklı gövde 409 döndürür.
- Teslimat/fatura adresleri yalnız alıcı organizasyonu scope'undan seçilir ve siparişe snapshot olarak yazılır; OrderItem UPDATE/DELETE DB trigger ile reddedilir.
- `/panel/sepet`, `/panel/checkout` ve ürün detayında sepete ekleme ekranları responsive olarak tamamlandı; demo alıcı işletmesi, teslimat/fatura adresleri ve minimum sipariş tutarı seed'e eklendi.

- `Inventory`, immutable `InventoryMovement`, `ProductFavorite` ve önizleme kapılı `ImportJob` modelleri yeni forward migration ile eklendi.
- Negatif stok/safety stock için application + PostgreSQL CHECK, stok hareketi UPDATE/DELETE yasağı için DB trigger ve optimistic `version` claim tamamlandı.
- OWNER/ORG_ADMIN/WAREHOUSE_OPERATOR için org-scoped stok ekranı/API'si; yabancı tedarikçi ID'sinde 404, zorunlu neden, movement ve redacted audit aynı transaction'da çalışır.
- Public katalog yalnız aktif ürün/varyant, aktif kategori/marka, doğrulanmış aktif tedarikçi ve `onHand > safetyStock` şartıyla görünür; public API explicit allowlist ile PII ve safety stock sızdırmaz.
- PostgreSQL trigram indeksli temel arama; kategori, marka, TRY fiyat aralığı ve stok filtresi responsive katalog ekranına eklendi.
- Kullanıcı-scoped ürün favorileme/kaldırma ve `/panel/favoriler` tamamlandı.
- CSV/XLSX dosyaları 2 MB/500 satır/ZIP açılım sınırıyla parse edilir; önce ürün yazmadan önizleme ve satır hatası üretir, sonra transaction claim ile idempotent uygulanır.
- Formula-injection güvenli CSV export ve yalnız katalog adminlerinin eriştiği `/admin/importlar` ekran/API'si tamamlandı.
- Demo telefon aksesuarlarına safety stock üstü stok seed'i ve tedarikçi stok/import, alıcı favori kullanım akışları eklendi.

- Kategori ve marka admin yönetimi; `Product`, `ProductVariant`, `ProductImage` veri modeli ve forward migration tamamlandı.
- Doğrulanmış SUPPLIER/BOTH işletmesi için org-scoped ürün oluşturma, düzenleme ve moderasyona gönderme ekran/API'leri eklendi.
- Ürün başına temel TRY minor-unit toptan fiyat, SKU, MOQ, quantity step ve paket miktarı DB/application doğrulamasıyla eklendi.
- Yalnız `PLATFORM_ADMIN`/`PLATFORM_SUPER_ADMIN` ürün-kategori-marka yönetebilir; approve/reject işlemleri state machine, optimistic state claim ve redacted audit ile çalışır.
- Public `/urunler` ve `/urunler/[slug]` yalnız aktif ürün + doğrulanmış aktif tedarikçi gösterir; 360 px kritik akış doğrulandı.
- Development seed'e doğrulanmış demo mobil tedarikçi, kategori ağacı, üç marka ve görselli dört telefon aksesuarı ürünü eklendi.

- Better Auth 1.6.23 ile e-posta/parola kayıt-giriş, e-posta doğrulama, hashli ve süreli parola reset tokenı, 12 karakter parola alt sınırı, DB-backed session, güvenli cookie ve session revoke akışları tamamlandı.
- `User`, `Session`, `Account`, `Verification`, `Organization`, `OrganizationMembership`, `OrganizationInvitation`, `Address`, `VerificationApplication`, `VerificationDocument`, `AuditLog` ve atomik rate-limit modelleri forward migration ile eklendi.
- Tedarikçi/alıcı işletme onboarding'i, adres, hashli tek kullanımlık davet, merkezi server-side RBAC, üyelik rolü ve org kapsamlı sorgular tamamlandı.
- Private MinIO belge yükleme/okuma, MIME+magic byte+5 MB+checksum kontrolleri, admin kuyruğu ve doğrulama state machine'i tamamlandı.
- Kritik rol, doğrulama ve belge işlemleri aynı transaction'da redacted audit üretir; audit tablosu DB trigger ile UPDATE/DELETE kabul etmez.
- Development Mailpit e-postaları ve yalnız development/test ortamında çalışan güvenli demo admin/tedarikçi/alıcı seed hesapları eklendi.
- Org A/B izolasyonu, URL/ID belge erişimi, admin BFLA, private bucket, plaintext token, rate limit, audit ve PII/secret log güvenliği bağımsız entegrasyon testleriyle doğrulandı.

- Node.js 24.18.0, pnpm 11.15.0, Next.js 16.2.10, React 19.2.7, Prisma 7.8.0 ve PostgreSQL 18.4 uyumlu kararlı hat olarak sabitlendi.
- Next.js App Router, strict TypeScript, Tailwind CSS, ESLint, Prettier ve frozen lockfile temeli kuruldu.
- Zod environment doğrulaması, production güvenlik kontrolleri, response güvenlik başlıkları, structured logging/redaction ve request ID temeli eklendi.
- Prisma Faz 0 teknik şeması, forward migration ve tekrar çalıştırılabilir seed tamamlandı.
- PostgreSQL 18.4, kaynak koddan güvenlik yamalı MinIO ve Mailpit 1.30.0 için Docker Compose tanımı eklendi.
- Responsive Türkçe ana sayfa, liveness ve gerçek DB sorgulu readiness endpointleri tamamlandı.
- Birim, gerçek PostgreSQL entegrasyon ve masaüstü/mobil Playwright E2E testleri eklendi.
- CI, Dockerfile, OpenAPI çıktısı, worker iskeleti, README ve development/deployment belgeleri tamamlandı.
- Bağımsız Faz 0 incelemesinde bulunan production placeholder secret kabulü, derin log redaction açığı, timezone'suz DB kolonları, E2E stale-server riski, landmark/focus erişilebilirliği, Mailpit healthcheck ve Docker runtime eksikleri düzeltildi.

## Çalışan özellikler

- `/urunler/[slug]` üzerinden tek tedarikçili sepete ekleme; `/panel/sepet` miktar güncelleme/silme ve minimum tutar özeti.
- `/panel/checkout` üzerinden teslimat/fatura adresi seçimi, 15 dakikalık stok rezervasyonu, `DRAFT` sipariş snapshot'ı ve rezervasyon release'i.

- `/tedarikci/stok` stok ve safety stock yönetimi; `/tedarikci/import` CSV/XLSX önizleme/onay ve güvenli CSV export.
- `/urunler` üzerinde arama/kategori/marka/fiyat/stok filtresi; `/panel/favoriler` kullanıcı favorileri.
- `/admin/importlar` platform katalog admini import iş kuyruğu.

- `/urunler` public pilot ürün listesi ve `/urunler/[slug]` ürün detayı.
- `/tedarikci/urunler`, `/tedarikci/urunler/yeni`, `/tedarikci/urunler/[id]` ürün oluşturma/düzenleme/submit akışı.
- `/admin/urunler`, `/admin/kategoriler`, `/admin/markalar` moderasyon ve taksonomi yönetimi.

- `/kayit`, `/giris`, `/e-posta-dogrula`, `/sifremi-unuttum`, `/sifre-yenile` kimlik akışları.
- `/panel`, `/onboarding`, `/oturumlar` işletme ve hesap güvenliği akışları.
- `/admin/dogrulamalar` platform doğrulama kuyruğu ve state machine işlemleri.
- Private belge yalnız `/api/v1/verification-documents/{id}/content` yetkili endpoint'i üzerinden açılır; public MinIO URL'si 403 döner.

- `pnpm dev` ile açılan responsive Faz 0 ana sayfası.
- `GET /api/health/live` ile bağımlılıksız liveness kontrolü.
- `GET /api/health/ready` ile PostgreSQL `SELECT 1` readiness kontrolü.
- Prisma migration/seed ve `foundation.version` teknik kaydı.
- Localhost ile sınırlı PostgreSQL, MinIO ve Mailpit development bağlantı yapılandırması.
- Lint, format, strict typecheck, unit, integration, E2E ve production build kalite komutları.

## Doğrulama özeti

- Faz 3A hedefli ESLint ve global strict TypeScript typecheck başarılı.
- Faz 3A unit: 1 dosya, 3 test başarılı; MOQ/quantity-step, BigInt minor-unit KDV/toplam yuvarlaması, integer sınırı ve minimum sipariş dahil.
- Gerçek PostgreSQL integration: 1 dosya, 3 test başarılı. Org BOLA/RBAC, tek tedarikçi, adres scope, minimum tutar, aynı/farklı gövdede idempotency, immutable OrderItem, expiry release idempotency ve eşzamanlı oversell (1 başarı/1 güvenli 409) doğrulandı.
- Kritik Playwright: sistem Chrome kanalıyla masaüstü ve 360 px mobilde 2/2 başarılı; ürün ekleme → sepet → adresli checkout taslağı → ACTIVE rezervasyon → release akışı ve yatay taşma kontrolü geçti.
- `20260720213000_phase_03a_cart_checkout_reservation` dahil 6 migration PostgreSQL'de güncel; Faz 3A seed'i başarılı ve tekrar çalıştırılabilir.
- Dockerfile değişmedi; FAST PILOT talimatına göre Docker image build, production build ve tam sistem regresyonu çalıştırılmadı.

- Faz 2B hedefli ESLint ve global strict TypeScript typecheck başarılı.
- Faz 2B unit: 1 dosya, 8 test başarılı; availability/negatif sınır, CSV/XLSX parse, satır hata ayrımı ve beş formula-injection başlangıcı dahil.
- Gerçek PostgreSQL integration: Faz 2B 3/3 ve ilgili Faz 2A katalog regresyonu 3/3 başarılı. Org BOLA, eşzamanlı version claim (1 başarı/1 conflict), DB negatif stok CHECK, append-only movement, audit, public PII allowlist, arama/filtre, favori scope, preview-before-write, satır hatası, idempotent confirm, export ve admin RBAC doğrulandı.
- Kritik Playwright spec'i masaüstü ve 360 px mobilde 6/6 başarılı: stok güncelleme, birleşik arama/filtre, favori ve CSV preview→hata raporu→confirm akışları.
- `20260720184000_phase_02b_inventory_discovery` migration'ı PostgreSQL 18.4'e uygulandı; Faz 2B seed'i başarılı.
- Dockerfile değişmedi; FAST PILOT talimatına göre Docker image build, production build ve tam sistem regresyonu çalıştırılmadı.

- Faz 2A hedefli lint ve strict typecheck başarılı.
- Katalog unit: 1 dosya, 2 test başarılı; minor-unit/MOQ/step ve deny-by-default state machine dahil.
- Gerçek PostgreSQL integration: 1 dosya, 3 test başarılı; kategori/marka rolü, create/edit, BOLA, doğrulanmış tedarikçi kapısı, approve/reject, audit ve public yalnız-active görünürlüğü dahil.
- Kritik Playwright: 1 test başarılı; demo tedarikçi ürün oluşturdu/submit etti, admin onayladı, ürün 360 px public liste ve detayda fiyat/MOQ ile göründü.
- Faz 2A migration uygulandı; idempotent development seed iki ardışık çalışmada başarılı.
- Dockerfile değişmediği için kullanıcı talimatı uyarınca image build; kapsam dışı tam regresyon/build matrisi çalıştırılmadı.

- Faz 1 unit: 6 dosya, 17 test başarılı.
- Gerçek PostgreSQL/MinIO entegrasyonu: 2 dosya, 10 test başarılı; org isolation, IDOR/BFLA, token hash, atomik rate limit, rol/verifikasyon audit'i, tüm state machine sonuçları ve append-only audit dahil.
- Tam Playwright matrisi: desktop ve 360 px mobilde 10/10 test başarılı; Mailpit e-posta doğrulama, MinIO private belge, tedarikçi/alıcı onboarding ve admin onayı gerçek servislerle geçti.
- Next.js production build başarılı; 16 statik sayfa ve tüm Faz 1 dinamik route'ları derlendi.
- `docker compose build app` başarılı; `tedarikkopru-app:latest` üretildi.
- Final kalite turunda `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build` ve Docker app build sıfır çıkış koduyla tamamlandı.
- PostgreSQL, MinIO ve Mailpit healthy; PostgreSQL bağlantı kabul ediyor, Mailpit `8025`, MinIO konsolu `9001` ve MinIO health endpoint'i `200` döndürüyor.

- Format, lint ve strict typecheck: başarılı.
- Birim testleri: 3 dosya, 9 test başarılı; production secret reddi ve key adı/case/nesting bağımsız log redaction senaryoları dâhil.
- PostgreSQL entegrasyonu: 1 dosya, 3 test başarılı; iki forward migration ve seed'in iki ardışık çalışması PostgreSQL 18.4 üzerinde geçti. Teknik timestamp kolonları `timestamptz(3)` olarak doğrulandı.
- Playwright E2E: masaüstü ve 360 px mobil projelerinde 6 test başarılı; temiz sunucu, readiness, landmark ve skip-link klavye akışı dâhil.
- Next.js production build ve `tedarikkopru-app:latest` Docker image build: başarılı. Image'da Prisma için OpenSSL/CA çalışma zamanı bağımlılıkları bulunuyor.
- Üretim standalone konteyneri: liveness `200`, gerçek PostgreSQL readiness `200 ready`.
- Docker Compose v5.3.0: config başarılı; PostgreSQL, MinIO ve Mailpit container'ları healthy.
- MinIO: live/ready/konsol `200`; imzalı S3 bucket oluşturma, object put/get smoke testi başarılı.
- Mailpit: `/livez`, `/readyz` ve `http://localhost:8025` `200`; SMTP smoke mesajı UI/API içinde doğrulandı.

## Bilinen eksikler ve ortam kısıtları

- Docker Desktop 4.82.0 / Engine 29.6.1 / Compose v5.3.0 kullanıldı; servisler çalışır ve development smoke verileri yerel volume'larda bırakıldı.
- MinIO'nun güvenlik yamalı son release'i resmi prebuilt image sunmadığı için ilk development build'i kaynak koddan yapılır ve bu makinede yaklaşık 11 dakika sürdü.
- CSP şu an Faz 0 statik UI uyumluluğu için `style-src 'unsafe-inline'` içerir. Nonce/hash tabanlı sıkılaştırma sonraki UI güvenlik çalışmasında ele alınmalıdır; bu incelemede kapsam dışı karmaşıklık yaratmamak için değiştirilmedi.
- `pnpm audit` yerel TLS zincirinde `UNABLE_TO_VERIFY_LEAF_SIGNATURE` ile tamamlanamadı; bu sonuç “açık yok” olarak yorumlanmadı ve CI/kurumsal güvenilir CA ortamında yeniden çalıştırılmalıdır.
- Rezervasyonu satışa dönüştürme, canlı/mock ödeme, manuel banka transferi onayı, RFQ, tedarikçi sipariş kabulü, kargo, iade, dropshipping ve pazaryeri entegrasyonları bilinçli olarak yoktur; Faz 3B+ başlatılmadı.
- Süresi dolmuş rezervasyonlar pilotta sepet/checkout erişiminde ve checkout oluşturmadan önce lazy release edilir; sürekli çalışan production scheduler/worker Faz 3A kapsamı dışındadır.
- Import pilotu tek process içinde request-time parse/confirm kullanır; background worker, object-storage dosya saklama ve büyük batch ölçeklemesi kapsam dışıdır. Harici görsel URL'leri fetch edilmez.
- Public arama temel PostgreSQL `ILIKE`/trigram indeks yaklaşımıdır; gelişmiş relevance, typo tolerance veya ayrı arama servisi yoktur.
- ExcelJS 4.4.0 resmi upstream kararlı latest sürümüdür ancak eski transitive paketler için pnpm uyarıları vardır; kurumsal CA ortamında `pnpm audit` ayrıca çalıştırılmalıdır.
- Pilot `ProductImage` kayıtları güvenilir local seed görsellerini kullanır; tedarikçi görsel upload/medya moderasyonu henüz yoktur.
- Demo malware tarama adaptörü Faz 1'de magic byte/MIME/boyut/checksum doğrulamasından sonra `CLEAN` sonucu verir; production antivirüs/karantina servisi seçimi yayın öncesi dış bağımlılıktır.
- Yerel Playwright çalışması kurulu Microsoft Edge kanalını kullandı; CI temiz Linux ortamında resmi Playwright Chromium kurulumunu kullanır.
- Hukuki saklama süreleri ve KVKK silme/anonimleştirme prosedürü production öncesi hukuk kararı gerektirir; Faz 1 hard-delete endpoint'i sunmaz.
- Gerçek servis kimlik bilgileri ve canlı feature flag'leri yoktur; hiçbir canlı çağrı yapılmadı.
- Hukuk/KVKK, mali müşavir, ödeme kuruluşu ve pilot kategori doğrulamaları sonraki ilgili fazların dış bağımlılıklarıdır.

## Önerilen sonraki faz

Yeni ve açık bir kullanıcı talimatıyla Faz 3B ele alınabilir. RFQ, mock ödeme tamamlama veya manuel banka transferi ve tedarikçi sipariş kabulü mevcut immutable taslak/idempotency/rezervasyon temeli üzerine eklenmelidir. Bu çalışmada Faz 3B'ye geçilmedi.

> Codex her faz sonunda bu dosyayı gerçek durumla güncellemelidir.
