# Faz 03B-2 — Tedarikçi Sipariş Kararı

## Amaç ve kullanıcı sonucu

Bu hızlı pilot dilimi tamamlandığında yetkili tedarikçi kullanıcıları kendi `PAID` siparişlerini listeleyip detayını görüntüleyebilecek; siparişi bir kez kabul veya reddedebilecek; alıcı da aynı sipariş detayında güncel sonucu görebilecektir.

## Başlangıç durumu

- Son güvenli checkpoint `a6af5cc3cd115460248a0e058635a28221013cd5`; Faz 3B-1 mock ödeme ve alıcı siparişleri commitli, çalışma ağacı temizdir.
- Faz 3B-1, başarılı mock ödemede `PAID` Order, `COMPLETED` Checkout, `CONSUMED` StockReservation ve immutable `SALE` inventory movement üretir.
- `OrderStatusHistory` append-only, `OrderItem` immutable ve supplier organization siparişte mevcut; tedarikçi görünümü ve karar state machine'i henüz yoktur.

## Kapsam

### Dahil

- `PAID` siparişi `ACCEPTED` veya `REJECTED` terminal tedarikçi karar durumuna geçiren merkezi state machine.
- Tedarikçi org-scoped sipariş listesi ve detay ekranı; alıcı detayında güncel sipariş sonucu.
- Sadece aktif SUPPLIER/BOTH organizasyonunun `OWNER`, `ORG_ADMIN` veya `WAREHOUSE_OPERATOR` rollerine kabul/ret yetkisi.
- Karar endpoint'inde aynı sonuç için idempotent tekrar; ikinci status history/audit kaydı yok. Zıt veya `PAID` dışı karar 409.
- Append-only status history ve redacted accept/reject audit logları.
- Ret halinde `CONSUMED` rezervasyon ve `SALE` stok hareketi korunur; stok tekrar satışa açılmaz ve çift hareket oluşmaz. Refund/return bu faz kapsamı dışındadır.
- Hedefli unit, gerçek PostgreSQL integration, Chrome masaüstü/360 px kritik E2E.

### Dahil değil

- RFQ, kargo, iade, refund, manuel banka transferi onayı, fatura, gerçek ödeme sağlayıcısı ve sonraki fazlar.
- Docker image build, production build ve tam sistem regresyonu.

## Bağlayıcı kararlar

- Kullanıcının FAST PILOT Faz 3B-2 talimatı yalnız tedarikçi kabul/ret akışını bağlar.
- `DECISIONS.md` D-004/D-005/D-007: tedarikçi alıcı adresine gönderir; mock ödeme kullanılır; gerçek servisler kapsam dışıdır.
- `AGENTS.md`: finans, stok ve sipariş geçişleri merkezi serviste; org scope, deny-by-default, audit, immutable order item ve stock ledger zorunludur.

## Teknik kararlar

- Karar: `OrderStatus` enum'una `ACCEPTED` ve `REJECTED` eklenir; `OrderStatusHistory` yeni geçişi kayıt altına alır.
- Gerekçe: tek Order state machine'i alıcı/tadarikçi ekranlarının aynı güncel sonucu okumasını sağlar; yeni paralel karar tablosu gerektirmez.
- Alternatif: ayrıca SupplierDecision modeli tutmak.
- Sonuç: tekrar karar, conditional `PAID` claim ile history/audit üretmeden mevcut terminal Order'ı döndürür; karşıt karar 409 olur.
- Karar: ret, Faz 3B-1'in `CONSUMED` reservation ve `SALE` ledger'ını değiştirmez.
- Gerekçe: ödeme başarılıdır; refund/iade siparişten ayrı hesaplanacak sonraki fazdır. Stoku erken geri koymak oversell ve finans/stok tutarsızlığı yaratır.

## Güvenlik ve veri etkisi

- Order okumaları `supplierOrganizationId` ile scope edilir; yabancı tedarikçi ID'si ve alıcı rolü 404/403 ile engellenir.
- Karar yetkisi yalnız supplier org'un aktif `OWNER`, `ORG_ADMIN`, `WAREHOUSE_OPERATOR` üyelerine verilir; diğer roller deny-by-default kalır.
- `OrderItem`, `OrderStatusHistory`, PaymentAttempt ve InventoryMovement immutable kalır.
- Decision transaction, conditional Order claim, append-only history ve audit'i atomik yazar. Ret stok/rezervasyon mutation'ı üretmez.

## Uygulama adımları

- [x] Zorunlu belgeler, Faz 3B-1 checkpoint'i, çalışma ağacı ve mevcut order/payment/reservation akışını incele.
- [x] Order enum/migration ve merkezi supplier decision state machine'ini ekle.
- [x] Supplier org API/UI listesi, detay ve karar formunu ekle.
- [x] Buyer detail'a güncel terminal durumu ekle.
- [x] Unit ve PostgreSQL BOLA/RBAC/idempotency/stok integration testlerini çalıştır/düzelt.
- [x] Chrome desktop + 360 px E2E'yi mevcut PostgreSQL volume üzerinde çalıştır.
- [x] Hedefli lint, strict typecheck, `PROJECT_STATUS.md` ve planı kanıtlarla kapat.
- [x] Son `git diff --check` sonrası Faz 3B-3'e geçmeden dur.

## Dosya değişiklikleri

- `prisma/schema.prisma`, yeni `prisma/migrations/*`
- sınırlı `src/modules/orders/**`, `src/lib/auth/**`
- `src/app/api/v1/organizations/**/orders/**`, `src/app/tedarikci/siparisler/**`, `src/components/orders/**`
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- `.agent/execplan.md`, `PROJECT_STATUS.md`

## Migration ve geri dönüş

- Faz 3B-1 migration geçmişi değiştirilmeden tek forward Faz 3B-2 migration'ı `ACCEPTED` ve `REJECTED` enum değerlerini ekler.
- Mevcut siparişler korunur; yeni durumlar yalnız tedarikçi kararından sonra yazılır.
- Geri dönüş uygulamayı checkpoint'e almakla sınırlıdır; immutable history ve ledger korunur, gerektiğinde ayrı forward migration planlanır.

## Test planı

- Unit: supplier decision state machine, idempotent aynı karar ve zıt karar reddi.
- Integration: supplier BOLA/RBAC, alıcı karar yasağı, aynı kararın tek history/audit üretmesi, `PAID` dışı geçiş reddi, ret sonrası `CONSUMED` reservation/`SALE` ledger ve stok değerlerinin korunması.
- E2E: demo alıcının `PAID` siparişi, demo tedarikçinin kabul/ret kararından sonra alıcı detayında güncel terminal durumla görünür; desktop + 360 px.
- Kalite: hedefli ESLint, global strict typecheck ve ilgili Vitest/Playwright; Dockerfile değişmedikçe image build yok.

## Kabul kriterleri

- Tedarikçi yalnız kendi `PAID` siparişini kabul veya reddedebilir; başka supplier order'ı 404 döner.
- Aynı kabul/ret tekrarında ikinci status history/audit kaydı üretilmez; zıt veya geçersiz geçiş 409 döner.
- Alıcı sipariş detayında `ACCEPTED` veya `REJECTED` güncel olarak görünür.
- Ret, Faz 3B-1 stok tüketimini tersine çeviremez; `CONSUMED` reservation, `SALE` movement ve onHand/reserved değerleri korunur.
- OrderItem snapshots immutable kalır; hedefli kalite hattı geçer.

## İlerleme günlüğü

- 2026-08-20 21:19 +03:00:
  - Yapılan: Tedarikçi kabul/ret state machine'i, org-scoped API/UI, alıcı durum görünümü, forward migration ve testler tamamlandı. E2E spec'e test işçisi seviyesinde `dotenv/config` eklendi; demo parolası kaynakta veya loglarda yer almadı.
  - Kanıt: schema validate/client generate, migration deploy ve seed başarılı; unit regresyon 6/6, supplier PostgreSQL integration 2/2, global strict typecheck ve hedefli ESLint başarılı.
  - Sonraki: Chrome E2E tamamlandığında belgeler son kanıtla kapatılmalı; sonraki faza geçmeden kullanıcı talimatı beklenmeli.

- 2026-08-20 22:29 +03:00:
  - Yapılan: Docker Desktop ile mevcut PostgreSQL volume ayağa kaldırıldı; schema güncelliği doğrulandı ve demo stok durumu gerektiği için seed bir kez çalıştırıldı. E2E spec'in `.env` parolası yalnız test işçisinde yüklendi; fallback parola kaldırıldı. 360 px alıcı detayındaki yatay taşma, daralabilir grid kolonu ve sipariş numarası satır kırmasıyla düzeltildi.
  - Kanıt: sistem Chrome'da `chromium-desktop` kabul/ret 2/2 ve `chromium-mobile` 360 px kabul/ret 2/2 başarılı; global strict typecheck, Faz 3B-2 hedefli ESLint ve `git diff --check` başarılı.
  - Sonraki: Kullanıcı talimatı olmadan Faz 3B-3 veya sonraki fazlara geçilmez.

- 2026-08-20 00:00 +03:00:
  - Yapılan: Faz 3B-1 checkpoint'i, zorunlu belgeler, aktif Faz 3 görevi ve çalışma ağacı okundu.
  - Kanıt: `git status` temiz, `git diff --check` başarılı; gerçek HEAD `a6af5cc3cd115460248a0e058635a28221013cd5`.
  - Sonraki: Forward migration ve merkezi tedarikçi karar state machine'i.

## Sürprizler ve öğrenilenler

- Kullanıcı tarafından verilen checkpoint `aeaf5cc…` olarak yazılmıştı; repodaki Faz 3B-1 commit'i `a6af5cc…` olarak doğrulandı.
- E2E'de `.env` değerini Playwright komutunun üst ortamına yüklemek `APP_URL`/origin davranışını değiştirebilir. Bu nedenle yalnız test işçisi spec'i `dotenv/config` yükler; parola fallback'i yoktur ve değer loglanmaz.

## Sonuç

Faz 3B-2 tamamlandı. Tedarikçi sipariş listesi/detayı, org-scoped idempotent kabul/ret, append-only history/audit, alıcı durum görünümü ve ret sonrası immutable stok davranışı uygulandı. Hedefli statik, unit, gerçek PostgreSQL integration ve sistem Chrome desktop/360 px E2E kanıtları başarılıdır. Docker image build, tam regresyon ve sonraki fazlar bilinçli olarak çalıştırılmadı.
