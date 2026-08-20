# Faz 4A — Kargo ve Teslimat Pilotu

Bu yürütme planı yalnız manuel kargo/takip pilotunu kapsar. Faz 3A, Faz
3B-1, Faz 3B-2 ve Faz 3C akışları korunacaktır.

## Amaç ve kullanıcı sonucu

Kabul edilmiş siparişin tedarikçi tarafından manuel takip bilgileriyle
kargoya verilebilmesi, teslim edildi olarak idempotent işaretlenebilmesi ve
alıcının kendi sipariş detayında güncel kargo bilgisini görebilmesi.

## Başlangıç durumu

- Checkpoint: `fb543a512800f62cdaebf4077589c412818f3b06`
- Çalışma ağacı temiz doğrulandı.
- Siparişler Faz 3B-2 sonunda `ACCEPTED` veya `REJECTED` terminal
  kararlarına sahiptir; stok ve ödeme ledger'ı immutable kalacaktır.

## Kapsam

### Dahil

- Shipment ve append-only shipment durum geçmişi
- Dar `ACCEPTED → SHIPPED → DELIVERED` order/kargo geçişleri
- Tedarikçinin taşıyıcı, takip numarası, kargoya verme ve tahmini teslim
  bilgilerini idempotent girmesi
- Tedarikçi yönetim ve alıcı görünüm ekranları
- Org-scoped RBAC/BOLA, audit, PostgreSQL migration ve testler

### Dahil değil

- Gerçek kargo sağlayıcıları, etiket/barkod/PDF, fiyat hesaplama
- Çoklu paket, split shipment, iade/refund, banka transferi ve gerçek ödeme
- Bildirim/outbox, Faz 4B veya sonraki fazlar

## Bağlayıcı kararlar

- D-004: Tedarikçi alıcı işletmenin adresine gönderir.
- D-007: Manuel kargo takibi pilot kapsamındadır; gerçek kargo adaptörleri
  sonraki fazdadır.
- D-008: Modüler monolit, PostgreSQL ve Prisma kullanılacaktır.

## Teknik kararlar

- Karar: Kargo verisi sipariş başına tek `Shipment` modelinde tutulur.
- Gerekçe: Pilot tek tedarikçi/tek paket varsayımını aşmadan idempotency,
  BOLA ve audit sınırlarını açık tutar.
- Alternatif: Çoklu paketli shipment aggregate.
- Sonuç: Split shipment/multi-package sonraki faza bırakılır.

## Güvenlik ve veri etkisi

- Tedarikçi mutation'ları `order:fulfill` ve supplier org scope ile
  sınırlanır; yabancı sipariş 404 döner.
- Alıcı kargo bilgisine yalnız kendi order scope'unda erişir.
- Carrier/tracking formatı doğrulanır; takip numarası, adres veya notlar
  audit payload'ına yazılmaz.
- OrderItem, stok, rezervasyon ve SALE ledger'a dokunulmaz.
- Yeni migration önceye dönük değiştirilmez; shipment history DB trigger ile
  append-only olur.

## Uygulama adımları

1. [x] Checkpoint, görev ve mimari bağlamı doğrula.
2. [x] Shipment şeması, migration ve dar durum kurallarını ekle.
3. [x] Merkezi shipping servisi ile org-scoped route'ları ekle.
4. [x] Tedarikçi yönetimi ve alıcı görünümünü sipariş detaylarına bağla.
5. [x] Hedefli unit, PostgreSQL integration, Chrome desktop/mobile E2E çalıştır.
6. [x] Migration/seed ve durum belgelerini gerçek sonuçla güncelle.

## Migration ve geri dönüş

Yeni ileriye dönük migration, yeni order enum değerlerini ve shipment
tablolarını ekler. Geri dönüş kod deploy'u ile durdurulur; immutable
geçmiş/ledger satırları silinmez.

## Kabul kriterleri

- Yalnız uygun `ACCEPTED` sipariş kargoya verilir.
- Yalnız `SHIPPED` sipariş teslim edildi olur; geriye dönüş yoktur.
- Aynı idempotency anahtarı ikinci shipment/history/audit kaydı üretmez.
- Tedarikçi ve alıcı BOLA denemeleri engellenir.
- Chrome desktop ve 360 px E2E alıcı-tedarikçi kargo akışını doğrular.

## İlerleme günlüğü

- 2026-08-21:
  - Yapılan: Faz 4A başlangıç bağlamı, checkpoint ve dar manuel kargo kapsamı doğrulandı.
  - Kanıt: `git status` temiz, `git diff --check` temiz, HEAD `fb543a5`.
  - Yapılan: `Shipment` ve append-only `ShipmentStatusHistory`, `SHIPPED`/`DELIVERED`
    order enum değerleri, forward migration ve dar geçiş kuralları eklendi.
  - Yapılan: Supplier org scope + `order:fulfill` RBAC ile kargo oluşturma ve teslim
    endpointleri; idempotency hash'i, serializable transaction, history ve redacted audit
    eklendi. Carrier/tracking audit payload'ına yazılmaz.
  - Yapılan: Tedarikçi sipariş detayında manuel kargo/tamamla formu ve kargo geçmişi;
    alıcı sipariş detayında org-scoped güncel kargo bilgisi/histories eklendi.
  - Kanıt: `20260821000000_phase_04a_shipping_delivery` PostgreSQL'e uygulandı;
    `pnpm db:seed`, `pnpm db:generate`, `pnpm db:validate` başarılı.
  - Kanıt: Hedefli ESLint ve `pnpm typecheck` başarılı; unit 2/2, gerçek PostgreSQL
    integration 2/2, Chrome `chromium-desktop` 1/1 ve 360 px `chromium-mobile` 1/1 geçti.
  - Kapsam dışı: Docker image build, tam regresyon, gerçek kargo sağlayıcısı, çoklu paket,
    split shipment, iade/refund ve Faz 4B çalıştırılmadı.

## Durum

- Tamamlandı — Faz 4A kargo ve teslimat pilotu; sonraki faz başlatılmadı.
