# Pilot MVP — Faz 7A Pazaryeri Entegrasyon Altyapısı

Bu yürütme kaydı, önceki pilot checkpoint'leri sonrasında uygulanan Faz 7A
pazaryeri entegrasyon altyapısını kapsar. Önceki RFQ, ödeme, sipariş, kargo ve
iade bölümleri tarihsel kayıt olarak korunur.

## Faz 7A — Pazaryeri entegrasyon altyapısı (tamamlandı)

- Favorites seçimini aktif/onaylı/stoklu katalog için canonical DTO'ya taşıyan ortak loader;
  genel XML export, Trendyol preview ve JSON export tarafından paylaşılır. Kullanıcı seçimi
  org/favorite scope dışına taşmaz; XML escaping ve `availableStock` filtresi korunur.
- `MarketplaceChannelAdapter` sözleşmesi Trendyol V2 mapper'ını ve Hepsiburada/Amazon TR
  için deterministik `NOT_IMPLEMENTED` skeletonlarını birleştirir. Trendyol live flag kapalı
  olduğunda ağ çağrısı yapmaz; test sonucu `PREVIEW` ve `MOCK-` batch id ile açıkça işaretlenir.
- Organization-scoped encrypted connection, sync job/item, webhook inbox/dedup/replay ve
  category/brand/attribute mapping forward migration ile eklendi. Owner/org admin dışındaki
  rol ve cross-org erişim 404 deny-by-default davranır; credential/audit/log redaction test
  kapsamındadır.
- Kullanıcı `/panel/entegrasyonlar` altında bağlantı/preview/test modunu, platform admin ise
  `/admin/entegrasyonlar` altında safe connection/mapping/job durumunu görür. Boş credential
  update'i eski değeri korur; disconnect cipher'ı açıkça siler.
- İzole Neon validation dalında `prisma migrate deploy` ile 14 migration güncel doğrulandı.
  Unit 54/54, PostgreSQL integration 3/3, Chrome desktop 1/1 ve 360 px mobile 1/1 geçti;
  global ESLint ve strict typecheck temizdir. Docker image build veya gerçek marketplace çağrısı
  çalıştırılmadı.

## Önceki final QA ve yayın hazırlığı

## Staging deployment hazırlığı

- Gerçek deploy veya sağlayıcı seçimi yapılmadı. Deployment runbook; stateless standalone
  app container, external PostgreSQL/S3/SMTP, TLS reverse proxy, release-job migration,
  health smoke ve kalıcı veri sınırlarını tanımlar.
- `DEPLOYMENT_ENV` development/staging/production ayrımını yapar. Production Node runtime;
  HTTPS public origin, güçlü secret'lar, doğrulanmış SMTP/TLS/kimlik bilgisi ve staging ya
  da production deploy ortamı olmadan başlamaz.
- `DEPLOYMENT_ENV=production` demo seed'i koşulsuz engeller. Staging demo verisi yalnız
  açıkça onaylanan, ayrı tek seferlik seed job'ında seçilebilir; normal staging runtime
  `DEMO_SEED_ENABLED=false` kullanır.

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

- Ana sayfadaki eski faz/foundation metinleri güncel pilot diliyle değiştirildi.
  360 px'te katalog bağlantısı üst menüde erişilebilir kalırken ikincil bağlantılar
  güvenle gizlenir. Uzun katalog adları satır kırar, boş arama sonucu temizleme
  bağlantısını sunar; sepet miktar güncellemesi erişilebilir başarı durumu gösterir.
- Türkçe 404 ve yeniden deneme düğmeli beklenmeyen hata ekranı eklendi. Yetki
  yokluğu dallarındaki bütün ana içerik hedefleri skip-link ile odaklanabilir.
- Chrome QA: foundation desktop 5/5, mobile 4/4; katalog/favori/import desktop
  ve mobile 4/4; cart/checkout, mock ödeme, kargo, banka transferi, RFQ,
  iade/refund ve admin operasyonları iki viewportta geçti. 390 px/768 px public
  katalog turunda yatay taşma yoktu. Mobil iade turunda geçici demo stok yetersiz
  kaldığında bir kez seed yenilendi; tekrar koşusu geçti.
- Final kalite kapısı: ESLint, strict typecheck, unit 44/44, PostgreSQL
  integration 32/32, Prisma schema/migration durumu ve tekrar seed başarılı.
  Docker image build çalıştırılmadı.
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
