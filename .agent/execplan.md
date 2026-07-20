# Faz 03A — Tek Tedarikçili Sepet ve Checkout Taslağı

## Amaç ve kullanıcı sonucu

Bu hızlı pilot dilimi tamamlandığında doğrulanmış bir alıcı, tek tedarikçiye ait ürünlerden sepet oluşturabilecek; MOQ, miktar adımı ve tedarikçi minimum sipariş tutarı sunucu tarafında doğrulanacak; kendi teslimat ve fatura adreslerini seçerek 15 dakikalık atomik stok rezervasyonuna bağlı idempotent checkout ve sipariş taslağı oluşturabilecektir.

## Başlangıç durumu

- Faz 2B checkpoint'i `4497d51` (`feat: complete phase 2b inventory and catalog tools`) ve temiz çalışma ağacı doğrulandı.
- Aktif/doğrulanmış tedarikçi ürünleri, varyant fiyat/MOQ/quantity-step, inventory ve immutable stok hareketleri hazırdır; rezervasyon, sepet, checkout ve sipariş modelleri yoktur.
- Mevcut stok uygunluğu `onHand - safetyStock` hesabını kullanır; Faz 3A ile `reserved` atomik hesaba katılacaktır.
- Kullanıcının FAST PILOT MVP talimatı yalnız Faz 3'ün ilk yarısını bağlar ve tam regresyonu/Docker image build'i yasaklar.

## Kapsam

### Dahil

- Tek alıcı organizasyonuna ait ve aynı anda yalnız tek tedarikçi taşıyan sepet; ürün ekleme, miktar güncelleme ve silme.
- UI ve server tarafında MOQ, quantity step, tek tedarikçi, aktif/satılabilir ürün, stok ve minimum sipariş tutarı doğrulaması.
- Alıcının kendi organizasyonuna scope edilmiş teslimat ve fatura adresi seçimi.
- Integer minor-unit ara toplam, KDV ve toplam hesapları.
- 15 dakika süreli atomik stok rezervasyonu; manuel ve süresi dolmuş rezervasyon release'i; append-only stok hareketi/audit kanıtı.
- Aynı idempotency key + aynı istek için aynı sonucu, aynı key + farklı istek için 409 döndüren checkout taslağı.
- `DRAFT` sipariş ve ürün/fiyat/varyant/adres snapshot'ları; OrderItem UPDATE/DELETE DB trigger koruması.
- Alıcı sepet ve checkout ekranları, ürün detayında sepete ekleme, güvenli demo alıcı organizasyonu/adresleri.
- Hedefli unit, gerçek PostgreSQL integration ve kritik Playwright E2E testleri.

### Dahil değil

- Canlı ödeme, manuel banka transferi onayı, mock ödeme tamamlama, RFQ.
- Tedarikçi sipariş kabulü, kargo, iade veya stok rezervasyonunu satışa dönüştürme.
- Çok tedarikçili sepet, kupon, kargo ücreti, checkout sonrası sipariş operasyon ekranları.
- Faz 3B veya sonraki fazlar; Dockerfile/image build ve tam sistem regresyonu.

## Bağlayıcı kararlar

- `DECISIONS.md` D-006: tek sepet tek tedarikçi; ikinci tedarikçi server tarafında reddedilir.
- Faz dosyası ve ürün şartnamesi: rezervasyon 15 dakika, negatif stok/oversell yok, checkout create idempotent, OrderItem snapshot immutable.
- `AGENTS.md`: para integer minor unit, stok/checkout transaction ve concurrency korumalı, tüm org verisi server-side scope edilmiş, kritik hareket audit log üretir.
- Son kullanıcı talimatı: yalnız hedefli kalite/test komutları; Dockerfile değişmedikçe image build yok.

## Teknik kararlar

- `Inventory.reserved` kalıcı sayaçtır; kullanılabilir stok `onHand - reserved - safetyStock` olarak hesaplanır. Rezervasyon claim'i PostgreSQL koşullu UPDATE içinde yapılır; iki checkout aynı stoğu aşamaz.
- Sepet `buyerOrganizationId` ile unique ve `supplierOrganizationId` ile bağlıdır. Sepet boşalınca supplier temizlenir; farklı supplier ekleme 409 döner.
- Tedarikçi minimum sipariş tutarı organizasyonda `minimumOrderAmountMinor` olarak tutulur ve DB CHECK ile negatif değer reddedilir.
- Checkout isteği adres ID'lerini içerir; idempotency hash canonical istek gövdesinden SHA-256 ile üretilir. Başarılı checkout sepet satırlarını snapshot'a çevirip sepeti atomik olarak boşaltır; mevcut key kontrolü sepet okumadan önce yapılır.
- Para hesapları BigInt tabanlı basis-point yuvarlamasıyla yapılır ve yalnız güvenli integer sınırında veritabanına yazılır.
- Checkout ve Order adresleri JSON snapshot tutar; başka organizasyona ait adres ID'si tek scope'lu sorguda bulunamaz. Snapshotlar API loglarına/audit metadata'ya yazılmaz.
- Süre dolumu aynı transaction içinde reservation status claim, reserved decrement, release movement ve checkout/order durum güncellemesi yapar; tekrar çağrı etkisizdir.

## Güvenlik ve veri etkisi

- Sepet/checkout/adres/order sorguları aktif membership + buyer organization scope'u taşır; yabancı ID 404 döndürür.
- Satın alma yetkisi OWNER, ORG_ADMIN ve ORDER_MANAGER ile sınırlıdır; supplier-only org checkout yapamaz.
- DB CHECK'leri `reserved >= 0`, `reserved <= onHand` ve mevcut negatif stok korumalarını birlikte uygular.
- Reservation/release append-only inventory movement ve kritik audit kayıtları üretir; PII/secret metadata'ya alınmaz.
- OrderItem snapshot UPDATE/DELETE migration trigger'ı ile reddedilir; kaynak ürün daha sonra değişse de taslak satırı değişmez.

## Uygulama adımları

- [x] Faz 2B checkpoint'ini, zorunlu belgeleri, şartnamenin ilgili bölümlerini ve mevcut stok/adres/RBAC kodunu incele.
- [x] Faz 3A kapsam, transaction, idempotency ve test yaklaşımını yaşayan plana yaz.
- [x] Prisma modelleri, forward migration ve generated client/seed güncellemesini ekle.
- [x] Cart/checkout domain kuralları, atomik rezervasyon/release servisleri ve org-scoped API'leri ekle.
- [x] Ürün detayına ekleme, alıcı sepet ve checkout ekranlarını ekle.
- [x] Hedefli unit, integration ve kritik E2E testlerini yazıp çalıştır.
- [x] İlgili lint/typecheck komutlarını çalıştır, hataları düzelt.
- [x] `PROJECT_STATUS.md` ve bu planı kanıtlarla tamamla; Faz 3B'ye geçmeden dur.

## Migration ve geri dönüş

- Mevcut migration dosyaları değiştirilmeden tek forward Faz 3A migration'ı oluşturulur.
- Migration mevcut inventory satırlarına `reserved = 0`, organizasyonlara minimum tutar `0` verir; veri kaybı yoktur.
- Rollback uygulamayı önceki checkpoint'e almak ve rezervasyon/sipariş verisi için saklama kararı sonrası ayrı forward migration kullanmaktır; immutable hareket veya sipariş satırı otomatik silinmez.

## Test planı

- Unit: MOQ/quantity-step, tek supplier, minimum tutar ve BigInt KDV/toplam hesapları.
- Integration: org BOLA/adres scope, başka supplier ve geçersiz miktar reddi, idempotency same/different body, eşzamanlı oversell engeli, expiry/manual release idempotency, immutable OrderItem snapshot.
- E2E: ürün detayından sepete ekleme, miktar/sepet görünümü, adresli checkout taslağı ve rezervasyon/release; masaüstü ve kritik 360 px görünüm.
- Kalite: yalnız değişen/ilgili dosyalarda ESLint, global strict typecheck, hedefli Vitest ve hedefli Playwright spec.

## İlerleme günlüğü

- 2026-07-20:
  - Yapılan: Faz 2B checkpoint/temiz ağaç, zorunlu belgeler, Faz 3 görev dosyası ve şartnamenin sepet/checkout/rezervasyon/idempotency/snapshot bölümleri incelendi; Faz 3A tasarımı sınırlandı.
  - Kanıt: `git log -1` = `4497d51`; başlangıç `git status --short` boş; mevcut Prisma, stok, adres ve UI yüzeyi okundu.
  - Sonraki: Forward schema/migration ve domain servislerini uygulamak.
- 2026-07-20 20:00 +03:00:
  - Yapılan: Cart/checkout/reservation/order şeması ve forward migration, atomik servis/API'ler, alıcı sepet/checkout UI'sı, demo alıcı/adres seed'i ve hedefli testler eklendi.
  - Kanıt: Prisma validate/generate başarılı; migration PostgreSQL'e uygulandı; seed başarılı; hedefli lint/typecheck ve unit 3/3 geçti.
  - Sonraki: PostgreSQL concurrency/idempotency testini ve kritik E2E'yi tamamlamak.
- 2026-07-20 20:10 +03:00:
  - Yapılan: PostgreSQL serializable çatışmasının genel 500 dönmesi bulundu ve güvenli 409 eşlemesiyle düzeltildi; entegrasyon/E2E tamamlandı; belgeler kapatıldı.
  - Kanıt: integration 3/3; Playwright desktop+360 px 2/2; `prisma migrate status` güncel, idempotent Faz 3A seed başarılı; final hedefli lint/typecheck başarılı; `git diff --check` başarılı.
  - Sonraki: Faz 3B'ye geçmeden kullanıcıya teslim etmek.

## Sonuç

Faz 3A tamamlandı. Tek tedarikçili sepet, adresli checkout taslağı, 15 dakikalık atomik rezervasyon/release, idempotent create ve immutable sipariş snapshot'ları çalışır. Faz 3B özellikleri bilinçli olarak kapsam dışıdır.
