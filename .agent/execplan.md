# Faz 4B — İade ve Refund Pilotu

Bu yürütme planı yalnız iade/refund pilotunu kapsar. Faz 3A, Faz 3B-1,
Faz 3B-2, Faz 3C ve Faz 4A akışları korunacaktır.

## Amaç ve kullanıcı sonucu

Alıcı, yalnız teslim edilmiş kendi siparişindeki ürün satırları için güvenli
tam/kısmi iade talebi açabilir. Tedarikçi kendi gelen talebini kabul veya
reddeder; kabul yalnız uygulama içi refund kaydı üretir. Tedarikçi ürünün
fiziksel olarak geri geldiğini ayrı bir idempotent adımda işaretlediğinde stok
tek kez geri eklenir.

## Başlangıç durumu

- Checkpoint: `2375c209b0ca89ec4e988727a8310874ab4cc49b`
- Çalışma ağacı temiz doğrulandı.
- Faz 4A sonunda sipariş yalnız `ACCEPTED → SHIPPED → DELIVERED` ilerler;
  OrderItem snapshot, `SALE` ledger ve ödeme kayıtları immutable kalır.

## Kapsam

### Dahil

- `ReturnRequest`, `ReturnItem`, `Refund`, `RefundItem` ve append-only iade
  durum geçmişi
- Dar `REQUESTED → ACCEPTED/REJECTED → RETURN_RECEIVED` iade state machine'i
- `DELIVERED` siparişten tam/kısmi satır bazlı iade açma
- Tedarikçi iade listesi/detayı, karar ve fiziksel teslim alma adımı
- Integer minor-unit refund hesaplama, idempotency, audit, RBAC/BOLA ve
  append-only `RETURN_RESTORE` stok hareketi
- Alıcı sipariş detayında iade oluşturma ve güncel iade görünümü

### Dahil değil

- Gerçek banka/kart refundu, gerçek iade kargo/etiket entegrasyonu
- Dosya, kondisyon inceleme, değişim, kupon/mağaza kredisi, dispute
- Banka transferi, fatura/e-arşiv ve sonraki fazlar

## Bağlayıcı kararlar

- D-004: Fiziksel ürün tedarikçiye geri döner; stok yalnız geri teslim
  doğrulamasından sonra artar.
- D-005: Pilot refundu gerçek sağlayıcı çağrısı yapmaz.
- D-008: Modüler monolit, PostgreSQL ve Prisma kullanılacaktır.

## Teknik kararlar

- Karar: Sipariş `DELIVERED` durumunda kalır; iadenin kendi state machine'i
  vardır.
- Gerekçe: Kısmi/tam birden çok iade, teslimat durumunu geri almadan izlenir.
- Karar: Kabul, sipariş satırı/miktar/tutar eşlemesi olan immutable application
  `Refund` kaydı üretir; teslim alma stok geri koyma için ayrı adımdır.
- Gerekçe: Para kaydı ile fiziksel stok hareketinin erken veya çift yazılmasını
  engeller.
- Alternatif: Kabulde stoku artırmak veya OrderStatus'a iade terminal değerleri
  eklemek.
- Sonuç: Fiziksel ürün doğrulanmadan satılabilir stok artmaz; mevcut kargo
  state machine'i bozulmaz.

## Güvenlik ve veri etkisi

- Alıcı mutation'ları `purchase:manage` ve buyer org scope; tedarikçi
  mutation'ları `order:fulfill` ve supplier org scope ile sınırlanır.
- Yabancı order/return ID'leri 404 döner. `DELIVERED` olmayan order, fazla
  miktar veya daha önce ayrılmış/iadelenmiş miktar reddedilir.
- İade açıklaması, takip/adres veya secret audit payload'ına yazılmaz.
- `Refund`, `RefundItem`, iade history ve `InventoryMovement` silinmez;
  history append-only'dir. Mevcut `SALE` hareketi ve OrderItem snapshot'ı
  değiştirilmez.
- Stock restore serializable transaction ve koşullu inventory update ile yalnız
  `RETURN_RECEIVED` geçişinde bir kez uygulanır.

## Uygulama adımları

1. [x] Checkpoint, görev ve mevcut ödeme/kargo/stok sınırlarını doğrula.
2. [x] Return/refund şeması, forward migration ve durum kurallarını ekle.
3. [x] Merkezi return servisi, org-scoped API route'ları ve idempotency ekle.
4. [x] Alıcı iade formu/durumu ile tedarikçi iade liste/detay akışını ekle.
5. [x] Hedefli unit, PostgreSQL integration, Chrome desktop/mobile E2E çalıştır.
6. [x] Migration/seed ve durum belgelerini gerçek sonuçla güncelle.

## Dosya değişiklikleri

- `prisma/schema.prisma`, yeni Faz 4B forward migration ve `prisma/seed.ts`
- `src/modules/returns/**`, iade/refund API route'ları ve UI bileşenleri
- Alıcı/supplier order ve return ekranları
- Hedefli unit, integration ve E2E testleri
- `PROJECT_STATUS.md` ve bu plan

## Migration ve geri dönüş

Yeni ileriye dönük migration iade/refund tablolarını, enum değerini ve
append-only trigger'ları ekler. Geri dönüş yeni kodun devre dışı bırakılmasıyla
yapılır; refund, iade history ve stok hareketi satırları silinmez.

## Test planı

- Unit: iade durumları, uygun durum ve terminal replay kuralları
- Integration: buyer/supplier BOLA-RBAC, iade miktarı, accept/reject,
  idempotent refund, receive sonrası tek `RETURN_RESTORE`, ret sonrası sıfır
  refund/stok artışı
- E2E: demo alıcı ödeme/kargo/teslimat sonrası iade açar; tedarikçi kabul eder
  ve teslim alır; alıcı güncel durumu görür; desktop ve 360 px yatay taşma
  kontrolü

## Kabul kriterleri

- Yalnız `DELIVERED` sipariş için geçerli satır miktarında iade açılır.
- Aynı karar veya teslim alma isteği ikinci refund/history/stock hareketi
  üretmez.
- Kabul edilen refund kaydı her OrderItem/miktar/tutar eşlemesini saklar;
  gerçek ödeme sağlayıcısı çağrılmaz.
- Stok yalnız `RETURN_RECEIVED` geçişinde ve bir kez artar; mevcut `SALE`
  hareketi değişmez.
- Alıcı/supplier BOLA denemeleri engellenir; Chrome desktop/360 px akışı geçer.

## İlerleme günlüğü

- 2026-08-21:
  - Yapılan: Faz 4B bağlamı, checkpoint, çalışma ağacı ve mevcut
    ödeme/kargo/stok sınırları doğrulandı.
  - Kanıt: `git status` temiz, `git diff --check` temiz, HEAD `2375c20`.
  - Sonraki: Return/refund şeması ve forward migration.

- 2026-08-21:
  - Yapılan: `ReturnRequest`/`ReturnItem`/`Refund`/`RefundItem`, append-only
    history ve `RETURN_RESTORE` forward migration ile eklendi. Merkezi
    serializable servis alıcı oluşturma, tedarikçi kabul/ret ve fiziksel teslim
    alma adımlarını org scope, idempotency, audit ve miktar korumalarıyla
    tamamladı. Alıcı sipariş detayı ile tedarikçi iade liste/detay ekranları
    eklendi.
  - Migration/seed: `20260821010000_phase_04b_return_refund_pilot` PostgreSQL'e
    uygulandı; Faz 4B demo seed'i başarılı oldu.
  - Kanıt: Hedefli ESLint ve `pnpm typecheck` başarılı; unit 3/3, gerçek
    PostgreSQL integration 2/2; Chrome `chromium-desktop` kabul/ret 2/2 ve
    360 px `chromium-mobile` kabul/ret 2/2 başarılı. E2E, aynı kabul/teslim
    alma isteğinde tek refund ve tek stok hareketini, ret durumunda sıfır refund
    ve stok artışını doğruladı.
  - Kısıt: Docker image build ve tam sistem regresyonu çalıştırılmadı.

## Sürprizler ve öğrenilenler

- Henüz yok.

## Sonuç

- Tamamlandı — Faz 4B iade/refund pilotu; commit oluşturulmadı ve sonraki faz
  başlatılmadı.
