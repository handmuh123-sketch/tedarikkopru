# PROJECT STATUS

**Durum:** Faz 7B Trendyol veri hazırlığı tamamlandı

**Aktif faz:** Faz 7B tamamlandı; sonraki faz başlatılmadı

**Son güncelleme:** 24 Ağustos 2026, +03:00

## Tamamlananlar

- Faz 7B tamamlandı: Trendyol category/brand/attribute/value external metadata cache’i ve
  mapping kaynak etiketi (`LIVE`/`MANUAL`/`MOCK`) forward migration ile eklendi. Cache upsert’i
  tekrarda duplicate üretmez; manual/mock mapping preview’a izin verse de server-side live
  publish kapısı gerçek provider metadata olmadan aktarımı reddeder.
- `/admin/entegrasyonlar/trendyol` cache tabanlı kategori/marka/attribute mapping merkezi,
  `/panel/entegrasyonlar/trendyol/onizleme` kartlı kullanıcı önizlemesi ve safety-first
  readiness nedenleri eklendi. Yeni kullanıcı alıcı işletme CTA’sı; draft, review ve approved
  organization durumları anlaşılır biçimde gösterilir; kullanıcı kendi başvurusunu onaylayamaz.
- İdempotent seed dört pilot ürünün attribute, barkod, stok, favorite ve özgün public demo
  görselini güncelledi. Faz 7A connection güvenliği, immutable order snapshot ve stock ledger
  değiştirilmedi.
- Faz 7B kalite kanıtı: global ESLint ve strict typecheck, unit 56/56, izole Neon PostgreSQL
  marketplace integration 4/4, Chrome `chromium-desktop` 2/2 ve 360 px `chromium-mobile` 2/2
  ile `pnpm build` başarılıdır. İzole Neon dalında 15 forward migration applied ve schema
  günceldir; gerçek Trendyol ağına çağrı veya Docker image build yapılmadı.

- Faz 7A tamamlandı: kullanıcı favorilerinden canonical marketplace product loader, mevcut
  genel XML export ile ortak serializer ve Trendyol V2 preview/JSON export akışı eklendi.
  Public olmayan görseller uydurulmaz; yalnız public HTTPS URL veya `S3_PUBLIC_BASE_URL` ile
  çözülebilen görseller aktarım için geçerlidir. Para integer minor-unit olarak kalır; mapper
  provider payload'ına TRY iki ondalıklı değeri yalnız son adımda dönüştürür.
- Organization-scoped `MarketplaceConnection`, `MarketplaceSyncJob`/item, webhook inbox ve
  category/brand/attribute mapping modelleri forward migration ile eklendi. Credential paketi
  AES-256-GCM ile `DATA_ENCRYPTION_KEY` altında şifrelenir; API, panel, admin, audit ve log
  plaintext secret döndürmez. `marketplace:manage` izni yalnız owner/org admin'e açıktır;
  yabancı org bağlantısı deny-by-default 404 döner.
- `/panel/entegrasyonlar`, `/admin/entegrasyonlar`, admin mapping endpointleri, connection
  test/disconnect/publish API'leri ve idempotent sync/webhook replay altyapısı tamamlandı.
  Trendyol live flag varsayılan kapalıdır; mock sonuç `PREVIEW` ve `MOCK-` ile işaretlenir,
  gerçek HTTP çağrısı yapılmaz. Hepsiburada ve Amazon TR aynı adapter sözleşmesinde güvenli
  `NOT_IMPLEMENTED` skeleton olarak kalır.
- Faz 7A kalite kanıtı: unit 54/54, izole Neon PostgreSQL integration 3/3, Chrome
  `chromium-desktop` 1/1 ve 360 px `chromium-mobile` 1/1 başarılıdır. İzole Neon dalında
  `20260823000000_phase_07a_marketplace_integrations` dahil 14 migration applied ve schema
  günceldir. Global strict typecheck ve ESLint uyarısız geçti; yeni/ilgili dosyalar formatlıdır.
  `docs/integrations/` altında mimari, Trendyol V2 kaynakları, activation/rollback ve kanal
  skeleton sınırları belgelendi.

- Staging/deploy hazırlığı tamamlandı; gerçek deploy yapılmadı. Runtime artık
  `DEPLOYMENT_ENV` ile staging/production ayrımını fail-fast doğrular. Production Node
  runtime doğrulanmış SMTP, TLS seçeneği ve SMTP kimlik bilgisi ister; uygulama
  `DEPLOYMENT_ENV=production` altında demo seed oluşturmaz. README ve deployment runbook;
  external PostgreSQL/S3/SMTP, release-job migration, health smoke, HTTPS proxy, kalıcı veri
  ve staging demo seed sınırlarını açıkça tanımlar.

- Pilot MVP final QA tamamlandı. Ana sayfadaki eski faz/foundation dili güncel pilot akışlarıyla değiştirildi; 360 px üst menü katalog bağlantısını korur, ikincil bölüm ve sistem bağlantılarını gizler. Uzun ürün adları kırılabilir, boş katalog sonucu filtre temizleme yolunu açıkça gösterir; sepet miktarı güncellemesi görünür başarı geri bildirimi verir.
- Genel hata deneyimi Türkçeleştirildi: bulunamayan rota kullanıcı dostu 404 ekranına, beklenmeyen istemci hatası yeniden deneme düğmeli 500 sınırına gider. Tüm yetki yokluğu dallarındaki skip-link hedefleri klavye odağı alır.
- Final responsive/erişilebilirlik turu: Chrome desktop ve 360 px temel sayfa, katalog, favori, sepet/checkout, admin operasyonları ve kritik ticari akışlarda yatay taşma göstermedi. Ek public kontrol 390 px ve 768 px'te ana sayfa, katalog ve ürün detayını doğruladı; skip link, ana landmark, görünür focus, form label/status ve Türkçe 404 kontrol edildi.
- Final kalite kanıtı: global ESLint/typecheck, unit 44/44 ve PostgreSQL integration 32/32 başarılı. İzole Chrome desktop/360 px smoke: katalog/favori/import 4/4, mock ödeme 1/1, kargo/teslimat 1/1, banka transferi/admin onayı 1/1, RFQ/teklif/checkout 2/2, iade/refund 2/2 ve admin operasyonları 1/1 geçti. Iade mobil koşusunda geniş turla tüketilen demo stok 409 üretti; bir kez tekrar seed sonrası aynı senaryo geçti, uygulama davranışı değiştirilmedi.

- Mobilde genel `nav` gizleme kuralı yalnız site üst menüsüne daraltıldı; admin, katalog ve içerik navigasyonları 360 px'te erişilebilir kaldı. Yeni admin operasyon E2E'si platform menüsü, ana landmark, görünür odak akışı ve yatay taşmayı desktop/mobile doğrular.

- E2E testleri demo parolası için tek, sessiz ve `.env` öncelikli yardımcı kullanır; kaynakta fallback veya hardcode demo parola yoktur. Playwright varsayılanı güvenilen `APP_URL`/`localhost` kökenini kullanır; aynı isimli RFQ ve sepet miktar alanları exact accessible locator ile ayrıştırılır.

- Platform için tutarlı `/admin` navigasyonu, sipariş/iade operasyon listesi ve detayları eklendi. Yetkili kullanıcılar sipariş, ödeme, kargo, iade ve uygulama içi refund durumunu adres veya gereksiz PII göstermeden takip eder; basit sipariş durum filtresi bulunur.
- Doğrulama, katalog/import, banka transferi ve operasyon ekranları deny-by-default server-side platform rolü ile korunur. `PLATFORM_SUPPORT` görüntüleme yapabilir; doğrulama ve banka transferi kararları yalnız SUPER_ADMIN/ADMIN/OPERATIONS rollerine daraltıldı. Mevcut karar transaction'ları idempotent audit izini korur.

- Kabul edilmiş ve süresi dolmamış RFQ teklifi, yalnız teklifin alıcısı tarafından yeni org-scoped endpoint ile sepete eklenebilir. Sepet satırı teklif kimliğini ve server-side yazılan integer TRY minor-unit fiyatını taşır; normal katalog eklemesi teklif bağını açıkça kaldırır.
- Checkout, teklifli her satırda RFQ/teklif kabul durumu, süre, alıcı, tedarikçi, ürün/varyant, hedef miktar ve fiyat snapshot eşleşmesini serializable transaction içinde tekrar doğrular. Başarılı sipariş satırı immutable teklif fiyatını snapshot olarak alır; yabancı alıcı 404, süresi dolmuş/değişmiş teklif 409 alır.
- RFQ detayına teklif-sepete ekleme aksiyonu ve sepete teklif fiyatı etiketi eklendi. PostgreSQL integration BOLA, tekrar ekleme, fiyat değişimine karşı server-side checkout fiyatı ve gerçek sipariş snapshot'ını kapsar; Chrome desktop/360 px akışı kabul → sepet → checkout taslağı ile geçti.

- `BANK_TRANSFER` payment provider ve transfer referansı/notu forward migration ile eklendi. Hesap adı ve IBAN yalnız environment kaynaklıdır; feature flag veya talimatlar yoksa akış kapalı kalır.
- Alıcı kendi checkout siparişi için transfer bildirimi başlatır; platform yetkilisi `/admin/odemeler` kuyruğunda idempotent onay/red verir. Onay mevcut tek `PAID`/`SALE`, ret tek reservation release akışını kullanır; gerçek banka API'si veya para transferi yapılmaz.
- Hedefli typecheck/ESLint ve Chrome `chromium-desktop` ile 360 px `chromium-mobile` banka transferi E2E geçti; migration ve seed uygulandı.

- `ReturnRequest`, satır bazlı `ReturnItem`, uygulama içi `Refund`/`RefundItem` ve append-only `ReturnStatusHistory` forward migration ile eklendi. İade state machine'i yalnız `REQUESTED → ACCEPTED → RETURN_RECEIVED` veya `REQUESTED → REJECTED` geçişine izin verir; sipariş `DELIVERED` kalır.
- Alıcı yalnız kendi `DELIVERED` siparişindeki kalan satır miktarı için `purchase:manage` ile iade açabilir. Önceden açık, kabul edilmiş veya teslim alınmış iade miktarı tekrar istenemez; yabancı alıcı/supplier order veya return ID'si 404 döner.
- Tedarikçi kendi talebini `order:fulfill` ile idempotent kabul/reddeder. Kabul, gerçek ödeme sağlayıcısına çağrı yapmadan OrderItem/miktar/tutar eşlemesi olan immutable integer minor-unit refund kaydı üretir; aynı karar ikinci refund, history veya audit üretmez.
- Tedarikçi ayrı idempotent fiziksel teslim alma adımında ürünü işaretler. Yalnız bu anda append-only `RETURN_RESTORE` hareketi `onHand` değerini bir kez artırır; OrderItem snapshot'ları ve mevcut `SALE` ledger değişmez. Ret senaryosunda refund ve stok artışı oluşmaz.
- Alıcı sipariş detayına iade formu/durum/refund görünümü, tedarikçiye `/tedarikci/iadeler` liste ve detay/karar/teslim alma ekranları eklendi. İade audit'i açıklama, adres veya secret saklamaz; `returns.version` demo seed kaydı Faz 4B olarak eklendi.

- `Shipment`, append-only `ShipmentStatusHistory` ve `OrderStatus` için `SHIPPED`/`DELIVERED` forward migration ile eklendi. Merkezi serializable servis yalnız `ACCEPTED → SHIPPED → DELIVERED` geçişlerini uygular; terminal durumdan geri dönüş yoktur.
- Onaylı tedarikçi `OWNER`/`ORG_ADMIN`/`WAREHOUSE_OPERATOR` üyeleri `order:fulfill` ile yalnız kendi kabul edilmiş siparişine kargo firması, manuel takip numarası, kargoya verilme ve tahmini teslim tarihini idempotent kaydeder; yalnız `SHIPPED` siparişi teslim edildi yapabilir. Aynı idempotency anahtarı history/audit çoğaltmaz, yabancı tedarikçi veya alıcı 404 alır.
- Tedarikçi sipariş detayına kargo oluşturma/teslim formu ve kargo durum geçmişi; alıcı sipariş detayına kendi siparişi için güncel kargo firması, takip numarası, tarihler ve kargo geçmişi eklendi. OrderItem snapshot'ları, rezervasyon, stok ve `SALE` ledger satırları değiştirilmedi.
- Carrier/tracking biçimi ve gönderim/tahmini teslim/tamamlanma tarih sırası doğrulanır. Kargo history DB trigger ile append-only'dir; kargo audit'leri taşıyıcı, takip numarası, adres ya da başka PII tutmaz. `shipping.version` seed kaydı Faz 4A olarak eklendi.

- `RequestForQuote`, `Quote`, append-only RFQ/teklif durum geçmişi ve `RfqStatus`/`QuoteStatus` forward migration ile eklendi. RFQ açık → teklifli → kabul/red akışı merkezi serializable transaction ile yürür; teklif birim fiyatı pozitif integer TRY minor-unit olarak DB CHECK ile korunur.
- Onaylı alıcı OWNER/ORG_ADMIN/ORDER_MANAGER üyeleri ürün varyantından hedef tedarikçiye RFQ oluşturur; onaylı tedarikçi OWNER/ORG_ADMIN/CATALOG_MANAGER üyeleri yalnız kendi gelen RFQ'larına idempotent teklif verir. Alıcı kararı aynı idempotency anahtarıyla history/audit çoğaltmaz; yabancı alıcı veya tedarikçi API'de 404 alır.
- Alıcı için ürün detayındaki teklif talep formu, `/panel/teklif-talepleri` liste/detay ve kabul/ret görünümü; tedarikçi için `/tedarikci/teklifler` liste/detay ve fiyat teklifi formu tamamlandı. Kabul edilen geçerli teklif doğrudan fiyat/miktar bağını koruyarak mevcut sepet/checkout akışına eklenir; sipariş snapshot, rezervasyon ve ödeme state machine'leri korunur.
- Audit kayıtları notları kaydetmeden RFQ oluşturma, teklif verme ve kabul/ret olaylarını kaydeder. Demo seed, mevcut demo hesapların parolasını `.env` ile hashleyip eşitler ve eski demo oturumlarını kapatır; secret loglanmaz.

- `OrderStatus` için forward migration ile `ACCEPTED` ve `REJECTED` terminal durumları eklendi; mevcut append-only `OrderStatusHistory` tedarikçi kararlarını kaydeder.
- Doğrulanmış SUPPLIER/BOTH işletmesinin aktif `OWNER`, `ORG_ADMIN` ve `WAREHOUSE_OPERATOR` üyeleri, yalnız kendi `PAID` siparişleri için org-scoped kabul/ret kararı verebilir. Alıcı veya yabancı tedarikçi 404 alır.
- Merkezi karar state machine'i koşullu `PAID` claim, history ve redacted audit'i tek transaction'da yazar. Aynı karar replay'inde ikinci history/audit oluşmaz; karşıt veya `PAID` öncesi karar 409 döner.
- `/tedarikci/siparisler` ve `/tedarikci/siparisler/[orderId]` ile tedarikçi sipariş listesi, immutable satır/adres snapshot'ı, karar formu ve durum geçmişi eklendi; panelden erişim sağlandı.
- Alıcı sipariş detayında tedarikçi kabulü veya ret sonucu güncel olarak gösterilir. Ret, ödeme sonrasındaki `CONSUMED` rezervasyon, `SALE` hareketi, `onHand` ve `reserved` değerlerini değiştirmez; refund/iade kapsam dışı kalır.

- `Payment`, immutable `PaymentAttempt` ve append-only `OrderStatusHistory` modelleri; forward migration, mevcut `DRAFT` siparişler için history backfill'i ve immutable DB trigger'ları eklendi.
- Mock ödeme başlatma/tamamlama merkezi state machine üzerinden çalışır: ayrı başlangıç/tamamlama `Idempotency-Key`'leri aynı isteği tekrarlar, farklı gövdeyi 409 ile reddeder ve sipariş başına tek Payment oluşturur.
- `SUCCEEDED` sonucu ACTIVE rezervasyonu atomik olarak `CONSUMED` yapar; `onHand` ve `reserved` değerlerini düşürür, immutable `SALE` movement ve redacted audit üretir. `DECLINED`, `CANCELLED` ve timeout tek kez release eder; `PENDING` rezervasyonu korur.
- Alıcı organizasyonu kendi siparişlerini `/panel/siparisler` altında listeleyip immutable satır, adres snapshot'ı, ödeme ve durum geçmişiyle görüntüler; mock ödeme UI'sı yalnız server-side POST state transition kullanır.
- Mock ödeme development/testte `PAYMENT_PROVIDER=mock` ile, production'da yalnız açık `FEATURE_MOCK_PAYMENTS` bayrağıyla erişilebilir; kart, CVV veya provider secret alınmaz.

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

- `/panel/siparisler/[orderId]` yalnız teslim edilmiş sipariş için satır bazlı iade talebi açar ve güncel iade/refund durumunu gösterir; `/tedarikci/iadeler` kendi iade taleplerini kabul/ret ve fiziksel teslim alma adımıyla yönetir.

- `/tedarikci/siparisler/[orderId]` kabul edilmiş siparişi manuel takip bilgisiyle kargoya verir ve yalnız `SHIPPED` siparişi teslim edildi yapar; `/panel/siparisler/[orderId]` alıcıya org-scoped güncel kargo bilgisini ve `DELIVERED` durumunu gösterir.

- `/urunler/[slug]` alıcıda RFQ oluşturma, `/panel/teklif-talepleri` alıcı RFQ/teklif liste-detal-karar ve `/tedarikci/teklifler` tedarikçi gelen RFQ/teklif akışını sunar.

- `/tedarikci/siparisler` üzerinden tedarikçi sipariş listesi ve `/tedarikci/siparisler/[orderId]` üzerinden `PAID` siparişi kabul/ret; alıcı `/panel/siparisler/[orderId]` detayında güncel terminal sonucu görür.

- `/panel/siparisler` ve `/panel/siparisler/[orderId]` üzerinden alıcıya org-scoped sipariş listesi/detayı; mock ödeme başlatma ve başarılı/ret/iptal tamamlama akışı.

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

- Final kalite turu: `pnpm lint`, `pnpm typecheck`, unit suite 44/44 ve gerçek PostgreSQL integration suite 32/32 başarılı. Kritik Chrome akışları izole çalıştırıldı: mock ödeme 2/2, banka transferi 2/2, kargo/teslim 2/2, RFQ/teklif→checkout 4/4, iade/refund 4/4; cross-org/admin yetki sınırları security integration kapsamında doğrulandı.
- Release hazırlığı: `pnpm build` başarılı; Prisma schema doğrulandı/client üretildi, `prisma migrate status` 13 forward migration için güncel, development seed tekrar çalıştırılabilir biçimde başarılı. Docker image build çalıştırılmadı.

- Responsive/erişilebilirlik turu: admin operasyon Chrome desktop 1/1 ve 360 px mobile 1/1; foundation landmark, skip-link, focus, liveness/readiness ve yatay taşma desktop/mobile 6/6 geçti.

- Pilot admin operasyonları hedefli ESLint ve strict `pnpm typecheck` ile geçti. Gerçek PostgreSQL güvenlik integration'ı 8/8 geçti; normal kullanıcının admin kuyruğundan engellenmesi ve `PLATFORM_SUPPORT` rolünün yalnız görüntüleme sınırı kapsandı.

- Faz 4B hedefli ESLint ve global strict `pnpm typecheck` başarılı; final `git diff --check` temiz.
- Faz 4B unit: 1 dosya, 3/3 test başarılı; yalnız `DELIVERED` oluşturma, karar ve fiziksel teslim alma/replay kuralları kapsandı.
- Gerçek PostgreSQL integration: 1 dosya, 2/2 test başarılı; buyer/supplier BOLA-RBAC, fazla/tekrar miktar reddi, kabulde tek refund, teslim almada tek `RETURN_RESTORE` ve ret sonrası sıfır refund/stok artışı kapsandı.
- Prisma schema/client doğrulandı; `20260821010000_phase_04b_return_refund_pilot` forward migration'ı PostgreSQL'e uygulandı ve Faz 4B demo seed'i başarılı oldu.
- Kritik Chrome E2E: `tests/e2e/return-refund.spec.ts` `.env` değerlerini `dotenv/config` ile secret göstermeden yükler. `chromium-desktop` kabul/ret 2/2 ve 360 px `chromium-mobile` kabul/ret 2/2 geçti; alıcı iadesi, supplier karar/refund, idempotent karar/teslim alma, tek stok geri koyma, ret yan etkisizliği ve mobil yatay taşma doğrulandı.
- Docker image build ve tam sistem regresyonu FAST PILOT talimatı gereği çalıştırılmadı.

- Faz 4A hedefli ESLint ve global strict `pnpm typecheck` başarılı; `git diff --check` temiz.
- Faz 4A unit: 1 dosya, 2/2 test başarılı; dar shipment oluşturma/teslim transition ve terminal replay kuralları kapsandı.
- Gerçek PostgreSQL integration: 1 dosya, 2/2 test başarılı; supplier/buyer BOLA, `order:fulfill` RBAC, aynı idempotency key replay'i, farklı gövdede 409, tek shipment/order history ve audit, terminal geri dönüş yasağı ile stok/`SALE` ledger korunumu kapsandı.
- Prisma schema/client doğrulandı; `20260821000000_phase_04a_shipping_delivery` forward migration'ı PostgreSQL'e uygulandı ve Faz 4A demo seed'i başarılı oldu.
- Kritik Chrome E2E: `tests/e2e/shipment-delivery.spec.ts` `.env` değerlerini `dotenv/config` ile secret göstermeden yükler. `chromium-desktop` 1/1 ve 360 px `chromium-mobile` 1/1 geçti; alıcı ödeme → supplier accept → kargoya verme → idempotent replay → alıcı görünümü → teslim → idempotent replay → alıcı `DELIVERED` görünümü ve yatay taşma doğrulandı.
- Docker image build ve tam sistem regresyonu FAST PILOT talimatı gereği çalıştırılmadı.

- Faz 3C hedefli ESLint ve global strict `pnpm typecheck` başarılı; `git diff --check` temiz.
- Faz 3C unit: 1 dosya, 3/3 test başarılı; MOQ/step, teklif verme ve alıcı karar state machine/replay kuralları kapsandı.
- Gerçek PostgreSQL integration: 1 dosya, 2/2 test başarılı; supplier/buyer BOLA, org-scoped RBAC, teklif ve karar idempotency'si, tek durum geçmişi/audit, zıt karar 409 ve kabul/ret kapsandı.
- `20260820100000_phase_03c_rfq_pilot` forward migration'ı PostgreSQL'e uygulandı; Prisma schema/client ve tekrar çalıştırılabilir Faz 3C demo seed'i başarılı oldu.
- Kritik Chrome E2E: `tests/e2e/rfq-quote.spec.ts` `.env` değerlerini `dotenv/config` ile secret göstermeden yükler. Masaüstü `chromium-desktop` kabul/ret 2/2 ve 360 px `chromium-mobile` kabul/ret 2/2 geçti; alıcı RFQ oluşturma, tedarikçi teklif verme, alıcı terminal kararı ve yatay taşma kontrolü doğrulandı.

- Faz 3B-2 global strict `pnpm typecheck` ve Faz 3B-2 kaynak/test yollarındaki hedefli ESLint başarısız uyarı olmadan geçti.
- Unit regresyon: Faz 3B-1 mock ödeme ve Faz 3B-2 supplier decision dosyalarında 6/6 test başarılı; `PAID` geçişi, aynı karar replay'i ve zıt karar reddi kapsandı.
- Gerçek PostgreSQL integration: 1 dosya, 2/2 test başarılı; supplier BOLA/RBAC, alıcı karar yasağı, idempotent accept/reject, tek history/audit, zıt karar 409 ve ret sonrası `CONSUMED` rezervasyon/`SALE` ledger/stok korunumu doğrulandı.
- Prisma schema doğrulandı, client üretildi; `20260820000000_phase_03b2_supplier_order_decision` migration'ı PostgreSQL'e uygulandı. Faz 3B-2 seed'i başarıyla tekrar çalıştırıldı.
- Kritik Chrome E2E için `tests/e2e/supplier-order-decision.spec.ts` `.env` değerlerini test işçisinde `dotenv/config` ile yükler; demo parolası loglanmaz veya hardcode edilmez. Mevcut PostgreSQL volume ile `chromium-desktop` kabul/ret 2/2 ve 360 px `chromium-mobile` kabul/ret 2/2 geçti; alıcı detayında terminal durum ve yatay taşma kontrolü doğrulandı.

- Faz 3B-1 global strict `pnpm typecheck` ve Faz 3B-1 kaynak/test yollarındaki hedefli ESLint başarısız uyarı olmadan geçti.
- Mock ödeme unit: 1 dosya, 3 test başarılı; sipariş numarası ve başarılı/ret/iptal state machine kuralları kapsandı.
- Gerçek PostgreSQL integration: 1 dosya, 3 test başarılı; BOLA/RBAC, start/complete idempotency, tek Payment/Attempt, atomik SALE, decline/cancel release, timeout release ve immutable history/attempt doğrulandı.
- Kritik Playwright: sistem Chrome kanalıyla masaüstü ve 360 px mobil projelerinde 2/2 başarılı; checkout taslağı → mock start → `PAID` → sipariş listesi ve yatay taşma akışı geçti.
- Prisma schema doğrulandı, client üretildi; `20260720220000_phase_03b1_mock_payment_orders` migration kaydı PostgreSQL'de applied ve yeni payment/history tabloları mevcut. Faz 3B-1 seed'i başarıyla ve tekrar çalıştırılabilir biçimde tamamlandı.

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

- Pilot güvenlik turunda tespit edilen düşük riskli teknik borç: teklif-sepete ekleme işlemi tekrar çağrıda satırı/audit'i korur, ancak bu endpoint ayrı bir idempotency header protokolü kullanmaz; sepet akışının mevcut basit upsert davranışı korunmuştur.

- Docker Desktop 4.82.0 / Engine 29.6.1 / Compose v5.3.0 kullanıldı; servisler çalışır ve development smoke verileri yerel volume'larda bırakıldı.
- MinIO'nun güvenlik yamalı son release'i resmi prebuilt image sunmadığı için ilk development build'i kaynak koddan yapılır ve bu makinede yaklaşık 11 dakika sürdü.
- CSP şu an Faz 0 statik UI uyumluluğu için `style-src 'unsafe-inline'` içerir. Nonce/hash tabanlı sıkılaştırma sonraki UI güvenlik çalışmasında ele alınmalıdır; bu incelemede kapsam dışı karmaşıklık yaratmamak için değiştirilmedi.
- `pnpm audit` yerel TLS zincirinde `UNABLE_TO_VERIFY_LEAF_SIGNATURE` ile tamamlanamadı; bu sonuç “açık yok” olarak yorumlanmadı ve CI/kurumsal güvenilir CA ortamında yeniden çalıştırılmalıdır.
- Mock ödeme, rezervasyonu satışa dönüştürme, tedarikçi kabul/ret, tek hedef tedarikçili RFQ ve kabul edilen teklifin checkout fiyatına taşınması, tek paketli manuel kargo/teslimat, uygulama içi iade/refund ve admin onaylı manuel banka transferi pilotu tamamlandı. Karşı teklif/pazarlık, mesajlaşma, ek, çoklu tedarikçi/açık artırma, otomatik süre sonlandırma worker'ı, gerçek ödeme/refund sağlayıcısı, gerçek kargo/iade kargo firması entegrasyonu, etiket/barkod, çoklu paket/split shipment, kondisyon inceleme, değişim, kupon/mağaza kredisi, dispute, dropshipping ve pazaryeri entegrasyonları bilinçli olarak yoktur.
- Bu Windows yerel ortamında `prisma migrate deploy` migration uygulandıktan sonra ayrıntısız `Schema engine error` ile non-zero döndü. `_prisma_migrations` applied kaydı, yeni tablolar, seed ve gerçek PostgreSQL integration testi şemanın uygulandığını doğruluyor; Prisma CLI teşhisi kurumsal/temiz ortamda ayrıca incelenmelidir.
- Faz 4A/4B kritik E2E, mevcut yerel demo volume üzerinde yeni sipariş, kargo, iade/refund ve audit geçmişi oluşturur. Aynı geliştirme verisiyle tekrar geniş bir E2E turu yapılacaksa katalog stoklarını yenilemek için seed bir kez çalıştırılmalıdır; geçmiş kayıtlar silinmez.
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

## Sonraki kapsam

Yeni ve açık bir kullanıcı talimatı olmadan sonraki faz başlatılmamalıdır. Mevcut immutable sipariş, idempotency, stok ledger, tedarikçi kararı, RFQ ve manuel kargo temeli korunmalıdır.

> Codex her faz sonunda bu dosyayı gerçek durumla güncellemelidir.
