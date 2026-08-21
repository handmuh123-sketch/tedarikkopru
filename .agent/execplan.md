# Faz 4C — Manuel Banka Transferi ve Ödeme Onayı

Bu yürütme planı, Faz 4B checkpoint'i `f6854f9` sonrasında yalnız manuel banka
transferi ödeme pilotunu kapsar. Mock ödeme, stok, sipariş, kargo ve iade
akışları korunacaktır.

## Amaç ve kullanıcı sonucu

Alıcı checkout ile oluşmuş siparişinde yapılandırılmış banka transferi
talimatlarını ve benzersiz ödeme referansını görerek ödeme bildirimi oluşturur.
Platform yetkilisi bekleyen transferi kendi ödeme kuyruğundan idempotent onay
veya red kararıyla işler. Onay, mevcut güvenli stok tüketme/`PAID` akışını;
red, mevcut rezervasyon serbest bırakma/iptal akışını uygular.

## Başlangıç durumu

- Checkpoint: `f6854f9` — Faz 4B return/refund pilotu.
- Çalışma ağacı temiz doğrulandı.
- `Payment`/`PaymentAttempt`, immutable order history ve stok ledger mevcut.
- Banka hesabı bilgisi kaynak koda yazılmayacak; yalnız environment'tan okunacak.

## Dahil

- `BANK_TRANSFER` provider, transfer referansı/notu ve forward migration
- Konfigürasyondan banka talimatı gösteren alıcı ödeme ekranı
- Platform admin ödeme kuyruk/detay, idempotent onay/red
- Payment/order history, redacted audit, BOLA/RBAC ve stok/rezervasyon güvenliği
- Hedefli unit, PostgreSQL integration ve Chrome desktop/360 px E2E

## Dahil değil

- Banka API'si, hesap hareketi eşleştirme, OCR/dekont, gerçek para transferi
- Kart sağlayıcısı veya canlı ödeme açılması

## Bağlayıcı kararlar

- D-005: Bu yalnız operasyonel pilot ödeme yöntemidir; platform fon tutmaz.
- Banka feature flag'i açık ve hesap adı/IBAN environment'ta tanımlı değilse
  transfer başlatılamaz; kaynak kodda fallback hesap bilgisi bulunmaz.
- Admin kararı `PaymentAttempt` append-only kaydıyla claim edilir. Aynı karar
  ikinci stok tüketimi, history veya audit oluşturmaz; zıt/sonraki karar 409'dur.

## Uygulama adımları

1. [x] Faz 4B checkpoint'i, ödeme çekirdeği ve şartname kapsamını doğrula.
2. [x] Bank transferi şeması, forward migration ve environment doğrulamasını ekle.
3. [x] Merkezi servis, buyer/admin API'leri ve idempotent settlement'i ekle.
4. [x] Buyer talimatı ile admin kuyruk/detay ekranlarını ekle.
5. [x] Hedefli testler ve desktop/360 px E2E çalıştır.
6. [x] Durum belgelerini güncelle, diff kontrolü ve checkpoint oluştur.

## Kabul kriterleri

- Başka alıcı transferi başlatamaz; platform admin olmayan kişi queue/karar göremez.
- Aynı admin onayı/reddi tek `PaymentAttempt`, order history, audit ve stok etkisi üretir.
- Onay `PAID` + tek `SALE`; ret `CANCELLED` + tek reservation release üretir.
- Banka talimatı yalnız environment'tan gelir, audit/log içine girmez.

## İlerleme günlüğü

- 2026-08-21: Faz 4B `f6854f9` ile checkpoint'e alındı; çalışma ağacı temizdi.
  Mevcut Faz 3 ödeme modeli ve Faz 3 görev dosyası, manuel banka transferi
  pilotunun şartname içi olduğunu doğruluyor.

- 2026-08-21: `BANK_TRANSFER` provider, environment kaynaklı talimatlar,
  alıcı bildirimi ve platform admin onay/red kuyruğu eklendi. Onay mevcut
  transaction ile tek `PAID`/`SALE`; red tek reservation release üretir.
  `20260821020000_phase_04c_bank_transfer_payment_pilot` migration'ı ve Faz
  4C seed'i başarılı. `pnpm typecheck`, hedefli ESLint ve Chrome desktop/360 px
  E2E geçti.

## Sonuç

- Uygulama ve hedefli E2E tamamlandı; Git checkpoint'i `.git/objects` yazma
  izni hatası nedeniyle alınamadı. Çalışma ağacı korunuyor; checkpoint
  alınmadan sonraki faz başlatılmamalı.
