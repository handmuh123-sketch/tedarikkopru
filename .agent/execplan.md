# Faz 03B-1 — Mock Ödeme ve Alıcı Siparişleri

## Amaç ve kullanıcı sonucu

Bu hızlı pilot dilimi tamamlandığında alıcı, Faz 3A checkout taslağındaki tek immutable siparişi mock ödeme sürecine alabilecek; ödeme sonucuna göre rezervasyon atomik olarak satış stoğuna dönüşecek veya serbest bırakılacak; kendi siparişlerini liste ve detay ekranında görebilecektir.

## Başlangıç durumu

- Son güvenli checkpoint `2deaff492596635cafb3071f7adfb80aa90999d5`; Faz 3A kodu commitli ve checkout başına unique `DRAFT` Order hazırdır.
- Checkout 15 dakika ACTIVE rezervasyon, immutable OrderItem snapshot, integer minor-unit toplam ve idempotent checkout oluşturur.
- Ödeme modeli, sipariş durum geçmişi, alıcı sipariş ekranları ve rezervasyonu gerçek stok düşümüne dönüştürme henüz yoktur.
- `next-env.d.ts` önceki Next dev sürecinde otomatik değişmişti; checkpointteki generated yoluna geri alındı ve Faz 3B-1 kapsamına dahil edilmeyecek.

## Kapsam

### Dahil

- Checkout sırasında tek kez üretilen immutable sipariş taslağını ödeme başlatıldığında `PAYMENT_PROCESSING`, başarıda `PAID` durumuna geçirmek.
- `Payment`, idempotent `PaymentAttempt` ve append-only `OrderStatusHistory` modelleri.
- Mock ödeme başlatma ve doğrulanmış server-side mock tamamlama; kart/token/provider secret verisi toplamayan dar adaptör.
- Başarıda ACTIVE rezervasyonu aynı transaction içinde `CONSUMED` yapıp `onHand` ve `reserved` değerlerini birlikte düşüren immutable `SALE` stok hareketi.
- Açık başarısızlık kuralları: ödeme PENDING iken rezervasyon orijinal 15 dakikalık süreye kadar korunur; `DECLINED` ve `CANCELLED` terminal sonuçlarında hemen tek kez release edilir; zaman aşımında existing expiry akışı release edip Payment'ı `EXPIRED` yapar.
- Başlatma ve tamamlama için ayrı `Idempotency-Key`; aynı key + aynı istek aynı sonuç, aynı key + farklı istek 409; order başına en fazla bir Payment.
- Org-scoped alıcı sipariş listesi ve detay ekranı; ödeme durumu, immutable satırlar, integer tutarlar ve kendi adres snapshot'ları.
- Kritik ödeme/sipariş/stok geçişlerinde redacted audit log.
- Hedefli unit, gerçek PostgreSQL integration ve yalnız mock ödeme/sipariş E2E.

### Dahil değil

- Banka transferi veya admin onayı, RFQ, tedarikçi sipariş kabulü.
- Kargo, iade, refund, payout, split/komisyon, gerçek ödeme sağlayıcısı veya webhook.
- Faz 3B-2 ve sonraki fazlar; Docker image build, production build ve tam sistem regresyonu.

## Bağlayıcı kararlar

- Son kullanıcı talimatı yalnız Faz 3B-1'i ve hedefli kalite hattını bağlar.
- `DECISIONS.md` D-005/D-007: pilot mock ödeme; canlı tahsilat ve lisanssız emanet yapı yok.
- Ürün şartnamesi 4.10: başarı rezervasyonu gerçek stok düşümüne dönüştürür; başarısız/iptal/zaman aşımı release eder; hareketler transaction, idempotency ve immutable ledger kullanır.
- `AGENTS.md`: redirect başarı kaynağı değildir, para minor unit, org scope/RBAC zorunlu, finans/stok/sipariş geçişi merkezi servistedir.

## Teknik kararlar

- Faz 3A checkout zaten checkout başına unique Order üretir; Faz 3B-1 ikinci Order oluşturmaz. Ödeme başlatma mevcut DRAFT Order'ı PAYMENT_PROCESSING'e geçirir, böylece aynı key veya yarış ikinci sipariş üretemez.
- Order başına tek Payment ve Payment başına tek terminal PaymentAttempt tutulur. Başlatma/completion request hash'leri SHA-256 canonical gövdeden üretilir; DB unique constraint concurrency'de son güvence olur.
- Mock tamamlama sonucu yalnız `SUCCEEDED`, `DECLINED` veya `CANCELLED` enum'udur. Kullanıcı redirect'i veya query parametresi durum değiştirmez; yalnız authenticated POST endpoint'i state machine'i çalıştırır.
- Başarı transaction'ı Payment/Order/Checkout claim, reservation claim, koşullu inventory update, SALE movement, status history ve audit'i birlikte yazar. Herhangi bir adım başarısızsa tamamı rollback olur.
- Başarısız terminal sonuçta Faz 3A release primitive'i kullanılır; ACTIVE claim sayesinde tekrar çağrı çift release/movement üretmez.
- Production ortamında mock endpoint yalnız açık `FEATURE_MOCK_PAYMENTS` bayrağıyla çalışır; development/testte PAYMENT_PROVIDER=mock ile kullanılabilir. Canlı ödeme bayrağı bu akışı açmaz.

## Güvenlik ve veri etkisi

- Payment ve Order her sorguda buyerOrganizationId + aktif purchase membership ile scope edilir; yabancı ID 404 döner.
- Mock akış kart, CVV, provider tokenı veya secret kabul etmez/loglamaz. Audit metadata yalnız durum ve hareket sayısı içerir.
- OrderItem değiştirilmeyecek; mevcut UPDATE/DELETE trigger korunur. PaymentAttempt ve OrderStatusHistory için de UPDATE/DELETE trigger eklenir.
- SALE dönüşümü `on_hand >= quantity AND reserved >= quantity` koşullu SQL update kullanır; negatif stok, oversell ve çift hareket DB/application katmanında engellenir.
- Forward migration mevcut DRAFT siparişleri kaybetmez; başlangıç DRAFT status history backfill'i yapar.

## Uygulama adımları

- [x] Checkpoint, zorunlu belgeler, şartname/acceptance ve Faz 3A Order/Checkout kodunu incele.
- [x] Başarılı/başarısız/iptal/zaman aşımı davranışı ile idempotency modelini yaşayan plana yaz.
- [x] Prisma modelleri, forward migration, generated client ve feature flag'i ekle.
- [x] Merkezi order/payment state machine, idempotent mock start/complete ve stok consume/release akışını ekle.
- [x] Org-scoped API, alıcı sipariş listesi/detayı ve mock ödeme UI'sını ekle.
- [x] Hedefli unit, PostgreSQL integration ve kritik E2E testlerini çalıştır/düzelt.
- [x] Hedefli lint ve strict typecheck'i doğrula.
- [x] `PROJECT_STATUS.md` ve planı kanıtlarla kapat; Faz 3B-2'ye geçmeden dur.

## Dosya değişiklikleri

- `prisma/schema.prisma`, yeni `prisma/migrations/*`
- `src/modules/payments/**`, sınırlı `src/modules/orders/**`
- `src/app/api/v1/organizations/**/orders/**`, `src/app/panel/siparisler/**`, `src/components/payments/**`
- `src/lib/env/**`, `.env.example`, gerekirse Docker Compose mock flag'i
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- `.agent/execplan.md`, `PROJECT_STATUS.md`

## Migration ve geri dönüş

- Faz 3A migration geçmişi değiştirilmeden tek forward Faz 3B-1 migration'ı oluşturulur.
- Mevcut order kayıtları için DRAFT history backfill edilir; inventory/order/payment verisi silinmez.
- Geri dönüş önce uygulama deploy'unu checkpoint'e almak, sonra finans/status verisini koruyarak ayrı forward migration kararı vermektir; payment/history/ledger hard-delete edilmez.

## Test planı

- Unit: order number formatı, mock outcome state machine ve terminal geçiş reddi.
- Integration: org BOLA/RBAC; start ve completion same/different-key idempotency; başarıda tek Payment/Order, reserved→sale atomik hareket; decline/cancel/timeout release idempotency; immutable OrderItem/history/attempt; audit ve minor-unit eşliği.
- E2E: demo alıcı checkout taslağı oluşturur, sipariş detayına gider, mock ödemeyi başlatıp başarıyla tamamlar, `PAID` ve sipariş listesinde görünürlüğü doğrular; masaüstü + 360 px.
- Kalite: yalnız ilgili ESLint, global strict typecheck, hedefli Vitest/Playwright; Dockerfile değişmedikçe image build yok.

## Kabul kriterleri

- Aynı idempotency key ikinci Payment, PaymentAttempt veya Order üretmez; farklı gövde 409 verir.
- Başarı rezervasyonu tek kez SALE'e dönüştürür; onHand/reserved doğru, negatif stok ve oversell yoktur.
- PENDING rezervasyonu korur; DECLINED/CANCELLED/timeout tek kez release eder ve çift hareket üretmez.
- OrderItem snapshot değişmez; status/payment geçmişi append-only kalır.
- Yalnız alıcı organizasyonu kendi sipariş ve ödeme kaydını okuyup değiştirebilir.
- Redirect/GET/query parametresi ödeme başarısı oluşturamaz; kritik geçiş audit üretir.
- Hedefli lint, typecheck, unit, integration ve kritik E2E başarılıdır.

## İlerleme günlüğü

- 2026-07-20 23:34 +03:00:
  - Yapılan: Faz 3B-1 forward migration ve generated client doğrulandı; seed tekrar çalıştırıldı. Hedefli lint, global strict typecheck, mock ödeme unit, gerçek PostgreSQL integration ve sistem Chrome masaüstü/360 px E2E başarıyla tamamlandı.
  - Kanıt: `pnpm typecheck`; hedefli `pnpm exec eslint`; unit 3/3; integration 3/3; Playwright `chromium-desktop` + `chromium-mobile` 2/2. `_prisma_migrations` Faz 3B-1 kaydı applied, `payments`, `payment_attempts` ve `order_status_history` tabloları mevcut.
  - Sonraki: Faz 3B-2'ye geçmeden yeni kullanıcı talimatını bekle.

- 2026-07-20 20:25 +03:00:
  - Yapılan: `2deaff4` checkpoint'i doğrulandı; zorunlu belgeler, acceptance matrisi ve şartnamenin checkout, reservation, order, payment, idempotency ve test bölümleri okundu; Faz 3B-1 sınırları ve failure kuralları donduruldu.
  - Kanıt: HEAD tam hash eşleşti; başlangıçta yalnız Next'in generated `next-env.d.ts` değişimi görüldü ve checkpoint içeriğine alındı.
  - Sonraki: Forward schema/migration ve merkezi ödeme state machine'ini uygulamak.

## Sürprizler ve öğrenilenler

- Faz 3A checkout zaten immutable DRAFT Order oluşturuyor. Faz 3B-1 bu kaydı ikinci kez üretmek yerine ödeme yaşam döngüsüne geçirerek “aynı key ikinci sipariş üretmez” koşulunu daha güçlü korur.
- Yerel Windows Prisma CLI'si `migrate deploy` sırasında migration'ı PostgreSQL'e uyguladıktan sonra ayrıntısız `Schema engine error` ile non-zero döndü. DB migration kaydı, tablolar, seed ve real-DB integration şemayı doğruladığı için uygulama tamamlandı; CLI teşhisi temiz/kurumsal ortamda ayrıca izlenmelidir.

## Sonuç

Faz 3B-1 tamamlandı. Mock ödeme, alıcı siparişleri, atomik stok tüketimi/release, append-only ödeme ve sipariş geçmişi, org scope/RBAC ve hedefli kalite hattı kanıtlandı. Docker image build ve tam sistem regresyonu bilinçli olarak çalıştırılmadı; Faz 3B-2 özellikleri kapsam dışıdır.
