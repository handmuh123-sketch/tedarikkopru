# Pilot Sağlamlaştırma — RFQ Tekliften Checkout'a

Bu yürütme kaydı Faz 4C checkpoint'i `e03b918` sonrasında kabul edilmiş RFQ
tekliflerinin güvenli biçimde mevcut sepet/checkout akışına taşınmasını kapsar.
Sipariş snapshot, rezervasyon, ödeme, kargo ve iade state machine'leri
değiştirilmemiştir.

## Güncel sonuç

- Yalnız kabul edilmiş, süresi dolmamış teklif alıcının kendi sepetine eklenir.
- Sunucu; alıcı, tedarikçi, ürün, varyant, hedef miktar, TRY para birimi ve
  teklif fiyatını eklemede ve checkout transaction'ında doğrular.
- Fiyat integer minor-unit olarak korunur; client fiyatı kabul edilmez.
- Yabancı org erişimi 404; geçersiz/süresi dolmuş teklif 409 döner.
- Tekrar ekleme aynı sepet satırını korur ve ikinci audit yan etkisi üretmez.
- Prisma client/schema doğrulandı; `20260821030000_rfq_quote_checkout_pilot`
  migration'ı PostgreSQL'e uygulandı. Hedefli unit 6/6, PostgreSQL integration
  3/3, Chrome desktop 2/2 ve 360 px mobile 2/2 geçti.
- Platform `/admin` navigasyonu, sipariş/iade liste-detay ekranları ve basit
  sipariş durum filtresi tamamlandı. Support görüntüleme yapar; doğrulama ve
  banka transferi kararları yalnız operasyon rollerine açıktır. Hedefli
  PostgreSQL güvenlik integration'ı 8/8 geçti.
- Güvenlik turunda E2E demo parola fallback'leri kaldırıldı; test ortamı `.env`
  değerini sessiz ve override ile tek kaynaktan alır. Playwright güvenilen
  `APP_URL`/`localhost` kökenini varsayılan kullanır; mock ödeme Chrome desktop
  ve mobile 2/2 geçti.
- Responsive/erişilebilirlik turunda mobil genel `nav` gizleme kuralı yalnız
  site üst menüsüne daraltıldı. Admin operasyon E2E desktop/mobile 2/2 ve
  foundation landmark/skip-link/focus testi desktop/mobile 6/6 geçti.

## Final sonuç

- Geniş kalite turu tamamlandı: ESLint, typecheck, unit 44/44 ve PostgreSQL
  integration 32/32 başarılı.
- Kritik Chrome akışları izole desktop/mobile projelerinde geçti: mock ödeme
  2/2, banka transferi 2/2, kargo/teslim 2/2, RFQ→checkout 4/4 ve iade/refund
  4/4. Cross-org/admin yetki sınırları güvenlik integration'ında doğrulandı.
- `pnpm build` başarılı; Prisma 13 forward migration için güncel, schema/client
  ve tekrarlanabilir seed doğrulandı. Docker image build çalıştırılmadı.
- Final checkpoint sonrasında sonraki faz başlatılmayacaktır. Aşağıdaki Faz 4C
  bölümü tarihsel bağlam içindir; checkpoint ilk Git yazma hatasından sonra
  başarıyla `e03b918` olarak alınmıştır.

---

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

## Tarihsel sonuç

- Uygulama ve hedefli E2E tamamlandı; ilk geçici Git yazma hatası tekrar
  denemede çözüldü ve checkpoint `e03b918` olarak başarıyla alındı.
