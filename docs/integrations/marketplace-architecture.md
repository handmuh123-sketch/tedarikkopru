# Pazaryeri entegrasyon mimarisi

## Amaç ve sınır

Faz 7A, seçilmiş kullanıcı favorilerinden pazaryeri ürün önizlemesi ve kontrollü aktarım
altyapısını sağlar. Uygulama modüler monolittir: katalog, fiyat ve stok gerçeğin kaynağı
olmaya devam eder; harici kanallar bunların kopyasını alır. Canlı çağrılar varsayılan olarak
kapalıdır.

## Akış

1. `favorite-product-loader`, oturumdaki kullanıcının yalnız kendi seçtiği, aktif, onaylı
   tedarikçiden gelen ve `availableStock > 0` olan ürünlerini canonical DTO'ya dönüştürür.
2. Genel XML export ve kanal mapper'ları bu DTO'yu paylaşır. Böylece XML ile pazaryeri
   görünürlüğü farklı katalog filtreleri kullanmaz.
3. `MarketplaceChannelAdapter` her kanalın map, validate, publish, price/stock update,
   status ve hata normalize sözleşmesini uygular.
4. Preview ve JSON export, provider'a çağrı yapmadan mapping/görsel/fiyat/stock hatalarını
   kullanıcıya gösterir.
5. Publish isteği `MarketplaceSyncJob` ve satırlarıyla kaydedilir. Aynı connection +
   idempotency key + request hash ikinci iş veya ikinci yan etki üretmez.

## Veri ve güvenlik

- `MarketplaceConnection`, organizasyon ve kanal için tektir. Credential paketi AES-256-GCM
  ile `DATA_ENCRYPTION_KEY` kullanılarak şifrelenir; yalnız HMAC fingerprint'i aranabilir.
- API, panel, admin ekranı, audit ve loglarda credential plaintext'i hiç dönmez. Boş credential
  alanları mevcut secret'ı silmez; açık disconnect işlemi cipher'ı kaldırır.
- Connection değişikliği yalnız `OWNER` veya `ORG_ADMIN` için `marketplace:manage` iznine
  açıktır. Tüm org-scoped erişim `404` deny-by-default davranır.
- `WebhookInbox`, imza sonucu, event kimliği ve payload hash'ini saklar; ham webhook gövdesi
  saklanmaz. Tekil external event aynı connection içinde no-op'tur.
- Audit kayıtları connection create/update/disconnect/test, publish/retry/replay ve mapping
  güncellemelerini kapsar. Hassas anahtar adları redakte edilir.

## Durumlar

- Connection: `DRAFT`, `CONNECTED`, `DEGRADED`, `ERROR`, `DISCONNECTED`, `DISABLED`.
- Job: `PREVIEW`, `PENDING`, `RUNNING`, `SUCCEEDED`, `PARTIAL`, `FAILED`.
- Satır: `PREVIEW`, `PENDING`, `SUCCEEDED`, `FAILED`, `SKIPPED`.
- Webhook: `RECEIVED`, `PROCESSED`, `REJECTED`, `FAILED`.

`PREVIEW` başarılı canlı aktarım anlamına gelmez. `MOCK-` ile başlayan provider request id'leri
özellikle gerçek ağ çağrısı yapılmadığını belirtir.

## Görseller ve mapping

Kanal payload'ına yalnız HTTPS ile internetten erişilebilen görseller girer. Mutlak HTTPS URL,
HTTPS `APP_URL` altında public yol veya HTTPS `S3_PUBLIC_BASE_URL` altında public object key
kullanılabilir. Görsel uydurulmaz; yoksa validation hatası oluşur.

Trendyol category, brand ve attribute mapping'leri platform yöneticisinin endpointleriyle
yönetilir. Source attribute anahtarı ürünün canonical `attributes` kaydındaki anahtarla eşleşir.
Eksik mapping provider çağrısından önce satırı geçersiz kılar.

## Çalıştırma

- Genel XML: `GET /api/v1/exports/favorites/xml`
- Trendyol preview: `GET /api/v1/marketplace/trendyol/preview`
- Trendyol JSON export: `GET /api/v1/marketplace/trendyol/export`
- Tedarikçi/yeniden satıcı paneli: `/panel/entegrasyonlar`
- Platform admin görünümü: `/admin/entegrasyonlar`

Canlı kanal açılışından önce ilgili kanal dokümanındaki checklist, credential erişimi, category /
brand / attribute mapping ve webhook imza doğrulaması tamamlanmalıdır.
