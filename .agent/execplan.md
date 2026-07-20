# Faz 02B — Stok ve Katalog Keşfi Pilot Dilimi

## Amaç ve kullanıcı sonucu

Bu hızlı pilot dilimi tamamlandığında yetkili tedarikçi varyant stok ve güvenlik stoğunu güvenli biçimde güncelleyebilecek; alıcı yalnız satışa uygun ürünleri arayıp kategori, marka, fiyat ve stok filtresiyle daraltabilecek ve favorileyebilecek; tedarikçi CSV/XLSX dosyasını önce satır bazlı önizleyip sonra açık onayla uygulayabilecek, güvenli CSV dışa aktarabilecek; admin import işlerini görebilecektir.

## Başlangıç durumu

- Faz 2A checkpoint'i `2fe3601` (`feat: complete phase 2a catalog pilot`) ve temiz çalışma ağacı doğrulandı.
- Kategori, marka, tek varyantlı ürün, moderasyon, public liste/detay ve telefon aksesuarı seed'i çalışıyor.
- PostgreSQL servisi ve Faz 1 kimlik/org/RBAC temeli hazır; Inventory, favori ve import modeli henüz yok.
- Kullanıcının FAST PILOT MVP talimatı Faz 2'nin yalnız ikinci yarısını bağlar ve tam regresyonu yasaklar.

## Kapsam

### Dahil

- `Inventory`, immutable `InventoryMovement`, `ProductFavorite` ve önizleme kapılı `ImportJob` modelleri.
- Stok miktarı, safety stock, optimistic version ve zorunlu ayarlama nedeni; negatif stok için application + DB koruması.
- OWNER/ORG_ADMIN/WAREHOUSE_OPERATOR stok yetkisi; tüm yazma sorgularında organization kapsamı ve başka tedarikçiye BOLA koruması.
- Tedarikçi stok ekranı ve güncelleme API'si; kritik stok değişiminde audit log.
- Public katalogda yalnız ACTIVE ürün, ACTIVE varyant, doğrulanmış/aktif tedarikçi ve `onHand - safetyStock > 0` görünürlüğü.
- Temel metin arama; kategori, marka, minor-unit fiyat aralığı ve stokta olanlar filtresi.
- Oturum kullanıcısı için ürün favorileme ve `/panel/favoriler` ekranı.
- CSV/XLSX dosya önizlemesi, satır bazlı hata raporu, açık onaydan önce sıfır ürün/stok yazımı, idempotent tek uygulama.
- Formula-injection güvenli CSV export ve admin import job görüntüleme.
- Demo ürünler için stok seed'i; hedefli unit, gerçek PostgreSQL integration ve kritik Playwright E2E.

### Dahil değil

- Stok rezervasyonu, sepet, checkout, sipariş, ödeme, kargo, dropshipping, pazaryeri entegrasyonu.
- Ayrı arama servisi, gelişmiş alaka/sıralama, tedarikçi favorisi/listeler ve background worker ölçeklemesi.
- Kademe fiyat Faz 2B kullanıcısının açık kapsam listesinde yoktur; bu dilimde eklenmez.
- Faz 3 veya sonrası ve Dockerfile/image build.

## Bağlayıcı kararlar

- Son kullanıcı talimatı: yalnız Faz 2B listesi, hedefli kalite komutları, Dockerfile değişmedikçe image build yok.
- `tasks/PHASE_02_CATALOG_INVENTORY.md`: negatif stok yasağı, org izolasyonu, satır bazlı import hatası, formula injection ve responsive katalog.
- `DECISIONS.md` D-003/D-007/D-008: telefon aksesuarı demo verisi, CSV/XLSX pilot entegrasyonu, PostgreSQL modüler monolit.
- `AGENTS.md`: stok hareketi hard-delete edilmez; kritik stok işlemi transaction/concurrency kontrollü; server-side deny-by-default RBAC.

## Teknik kararlar

- Karar: Pilot stok kaydı varyant başına tek `Inventory` ve denormalize `supplierOrganizationId` taşır.
- Gerekçe: Faz 2B depo/WMS kapsamı olmadan org-scope'u tek sorguda zorunlu kılar.
- Alternatif: `InventoryLocation` ile çoklu depo; pilot için gereksiz karmaşıklık.
- Sonuç: Sonraki depo fazı forward migration ile location ekleyebilir.

- Karar: Stok ayarı transaction içinde version claim, immutable movement ve audit üretir; DB CHECK/trigger ek güvence sağlar.
- Gerekçe: Negatif stok, kayıp ledger kaydı ve eşzamanlı overwrite engellenir.
- Alternatif: Basit ORM update; concurrency ve ledger atomikliği zayıf.
- Sonuç: İstemci güncel version göndermek zorundadır, conflict 409 döner.

- Karar: Import önizlemesi normalize edilmiş JSON satırları ve hata listesini `ImportJob` içinde private DB verisi olarak tutar; confirm aynı job'ı yalnız bir kez transaction ile uygular.
- Gerekçe: Dosyayı onaydan önce yazmama ve satır bazlı rapor koşullarını minimum altyapıyla karşılar.
- Alternatif: Object storage + worker; pilot için gereksiz.
- Sonuç: Dosya boyutu/satır sayısı sınırlandırılır, harici görsel URL fetch edilmez.

- Karar: XLSX parse için sürdürülen bir çalışma kitabı kütüphanesi, CSV için küçük güvenli parser kullanılır; export yalnız CSV ve hücre başı `= + - @` nötrleştirmesi yapar.
- Gerekçe: İstenen iki import biçimini desteklerken export yüzeyini dar tutar.
- Alternatif: Kendi ZIP/XML XLSX parser'ı; güvenlik ve bakım riski.
- Sonuç: Ek bağımlılık lockfile ile sabitlenir.

## Güvenlik ve veri etkisi

- Bütün stok/import sorguları membership ve `supplierOrganizationId` ile tek sorguda scope edilir; yabancı ID 404 verir.
- `on_hand >= 0`, `safety_stock >= 0`, `version >= 0` DB CHECK; movement UPDATE/DELETE trigger ile reddedilir.
- Stok ayarında reason zorunlu, actor ve balance snapshot kaydedilir; audit metadata ürün metni/PII içermez.
- Import yalnız `.csv/.xlsx`, küçük boyut ve sınırlı satır; formül hücreleri veri olarak ele alınır, çalıştırılmaz; export formula karakterlerini apostrofla kaçırır.
- Önizleme kalıcı ürün/stok tablosuna yazmaz; confirm geçerli satırları bir transaction içinde işler ve tekrar confirm ikinci kez yazmaz.
- Favoriler user-scoped unique kayıt; public ürün görünürlük şartı favori ekranında da yeniden uygulanır.

## Uygulama adımları

- [x] Zorunlu belgeleri, Faz 2A checkpoint'ini ve mevcut katalog/RBAC kodunu incele.
- [x] Faz 2B kapsam, güvenlik ve test yaklaşımını yaşayan plana yaz.
- [x] Prisma modelleri, forward migration, generated client ve demo stok seed'ini ekle.
- [x] Inventory domain servisi, org-scoped stok API'si ve tedarikçi stok ekranını ekle.
- [x] Public uygunluk sorgusu, arama/filtre ve responsive UI'yı ekle.
- [x] Favori API/buton ve alıcı favori ekranını ekle.
- [x] Import önizleme/confirm, hata raporu, CSV export ve admin job ekranını ekle.
- [x] Hedefli unit, integration ve kritik E2E testlerini yazıp çalıştır.
- [x] İlgili lint/typecheck komutlarını çalıştır, hataları düzelt.
- [x] `PROJECT_STATUS.md` ve bu planı kanıtlarla tamamla; Faz 3'e geçmeden dur.

## Dosya değişiklikleri

- `prisma/schema.prisma`, yeni `prisma/migrations/*`, `prisma/seed.ts`
- `src/modules/inventory/**`, `src/modules/catalog/**`
- `src/app/api/v1/organizations/**`, `src/app/api/v1/products/**`, `src/app/api/v1/favorites/**`, `src/app/api/v1/admin/imports/**`
- `src/app/tedarikci/stok/**`, `src/app/tedarikci/import/**`, `src/app/panel/favoriler/**`, `src/app/admin/importlar/**`, katalog sayfaları/bileşenleri
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- `.agent/execplan.md`, `PROJECT_STATUS.md`, gerektiği ölçüde `README.md`

## Migration ve geri dönüş

- Mevcut migration geçmişi değiştirilmeden yeni forward migration oluşturulur.
- Demo varyantlara seed sırasında inventory upsert edilir; production migration otomatik stok uydurmaz.
- Geri dönüş uygulama deploy'unu önceki commit'e almak ve yeni tabloları veri saklama kararı sonrası ayrı forward migration ile kaldırmaktır; immutable hareket verisi otomatik silinmez.

## Test planı

- Birim: availability/negatif stok, CSV formula injection, CSV/XLSX satır doğrulama ve önizleme kuralları.
- Entegrasyon: gerçek PostgreSQL'de org BOLA, negatif/concurrent version, immutable movement, public uygunluk/filtre, favorite scope, preview-before-write/idempotent confirm, admin job RBAC.
- E2E: stok güncelleme; arama/filtre; favori; CSV import önizleme/hata/onay temel akışları, 360 px kontrol.
- Kalite: yalnız ilgili ESLint dosyaları, global strict typecheck (script granüler değil), hedefli Vitest dosyaları ve hedefli Playwright spec.

## Kabul kriterleri

- Başka tedarikçinin stok veya ürününü ID değiştirerek değiştirme 404 ile engellenir.
- Negatif stok application ve PostgreSQL seviyesinde oluşamaz; stok ayarı immutable movement ve audit üretir.
- Public katalog yalnız aktif, doğrulanmış ve kullanılabilir stoğu olan ürün/varyantları gösterir.
- Arama, kategori, marka, fiyat aralığı ve stok filtresi birlikte çalışır.
- Kullanıcı ürün favorileyip kaldırabilir; başka kullanıcının favorisine erişemez.
- Import önizlemeden önce ürün/stok yazmaz; satır hatalarını ayrı raporlar; confirm idempotenttir.
- CSV export formula injection güvenlidir.
- Admin import jobs ekranına yetkisiz erişemez.
- Hedefli lint, typecheck, unit, integration ve kritik E2E başarılıdır; responsive temel akışta yatay taşma yoktur.

## İlerleme günlüğü

- 2026-07-20 18:20 +03:00:
  - Yapılan: Faz 2A checkpoint/temiz ağaç, zorunlu belgeler, şartname katalog-stok/import/güvenlik bölümleri ve kabul matrisi incelendi; Faz 2B tasarımı sınırlandı.
  - Kanıt: `git log -1` = `2fe3601`; başlangıç `git status --short` boş; belge ve mevcut Prisma/API/UI/test yüzeyi okundu.
  - Sonraki: Forward schema/migration ve stok domainini uygulamak.
- 2026-07-20 18:35 +03:00:
  - Yapılan: Inventory/movement/favorite/import modelleri, DB CHECK/append-only trigger/trigram index forward migration'ı, stok servisi/API/UI, public availability ve filtreler, favori akışı, CSV/XLSX preview-confirm/export ve admin job ekranı eklendi.
  - Kanıt: `prisma validate` ve generate başarılı; `20260720184000_phase_02b_inventory_discovery` gerçek PostgreSQL'e uygulandı; seed demo stoklarıyla başarılı.
  - Sonraki: Hedefli testleri tamamlamak ve güvenlik incelemesi yapmak.
- 2026-07-20 18:53 +03:00:
  - Yapılan: Unit/integration/E2E testleri tamamlandı; public API response allowlist ile PII ve safety-stock sızıntısı kapatıldı; XLSX ZIP açılım sınırı eklendi; önceki katalog testleri yeni stok görünürlüğüne uyarlandı.
  - Kanıt: hedefli lint ve strict typecheck başarılı; unit 8/8; Faz 2A+2B integration 6/6, son güvenlik turu 3/3; Playwright masaüstü+360 px 6/6; frozen lockfile offline, Prisma validate ve `git diff --check` başarılı; secret imzası yok.
  - Sonraki: Faz 3'e geçmeden kullanıcıya teslim etmek.

## Sürprizler ve öğrenilenler

- Aktif faz dosyası tüm Faz 2'yi içeriyor; kullanıcı kademe fiyatı bu ikinci yarının açık listesine almadığından bağlayıcı son talimata göre kapsam dışı bırakıldı.
- `exceljs@4.4.0` resmi upstream'in kararlı latest etiketi olarak doğrulandı; yerel TLS zinciri pnpm registry doğrulamasını engellediği için yalnız tek install çağrısında kalıcı ayar bırakmadan strict-ssl kapatıldı.
- İlk E2E koşusu `.env.example` localhost ile Playwright `127.0.0.1` origin farkı yüzünden auth katmanında başlamadan 6 testte durdu; yalnız test sürecinde APP_URL eşitlenince 6/6 geçti.
- Final incelemede ortak public sorgu sonucunun doğrudan JSON'a verilmesiyle oluşabilecek organization scalar/safety-stock sızıntısı bulundu ve explicit response allowlist + bağımsız integration assertion ile düzeltildi.

## Sonuç

Faz 2B pilot dilimi tamamlandı. Tedarikçi org-scoped ve optimistic version kontrollü stok yönetebilir; movement/audit append-only kanıtı oluşur; public katalog yalnız satışa uygun ve safety stock üstü ürünleri arama/filtreyle sunar; kullanıcı favori yönetir; CSV/XLSX import önce önizleme ve satır hatası üretip açık onayla idempotent uygulanır; CSV export formula-injection güvenlidir; admin import işlerini görür. Stok rezervasyonu, kademe fiyat, sepet ve Faz 3+ bilinçli olarak yoktur. Dockerfile değişmedi ve kullanıcı talimatıyla image build/tam regresyon çalıştırılmadı.
