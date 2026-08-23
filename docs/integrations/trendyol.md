# Trendyol V2 entegrasyonu

## Faz 7B veri hazırlığı

Trendyol bağlantısı üç ayrı modda çalışır: `PREVIEW`, `MOCK` ve `LIVE`. Preview ve mock
akışları provider ağına çıkmaz; `LIVE` yalnız feature flag, onaylı alıcı işletmesi, şifreli
satıcı credential’ı, HTTPS ürün görseli ve `LIVE` kaynaklı güncel meta veri eşleşmeleri birlikte
sağlandığında açılabilir.

Ürün aktarımında Product V2 yolları kullanılır. Kategori ağacı, kategori özellikleri ve marka
listesi yalnız resmi Trendyol API’sinden alınır; cache kayıtları `LIVE`, `MANUAL` veya `MOCK`
kaynağını saklar. `MANUAL`/`MOCK` eşleşme ile JSON preview yapılabilir ama canlı aktarım
sunucu tarafında bloke edilir. Bu ayrım uydurma provider ID’lerinin canlıya taşınmasını engeller.

Admin mapping merkezi `/admin/entegrasyonlar/trendyol` altındadır. Kaynak kategori/marka,
cache edilmiş provider kaydına bağlanır; ürün attribute anahtarları kategoriye özgü provider
attribute’larına bağlanır. Yönetim API’leri yalnız katalog admin rolüne açıktır ve safe audit
kaydı üretir. Metadata kaydı idempotent upsert’tür; credential, token veya ham provider cevabı
audit’e yazılmaz.

Alıcı tarafı `/panel/entegrasyonlar/trendyol/onizleme` üzerinden ürün kartlarını, SKU, barkod,
stok, integer minor-unit fiyatın gösterimini ve doğrulama nedenlerini görür. JSON indirme
`private, no-store` yanıt verir. Demo seed dört özgün statik `/demo-products` görseli ile
ürün niteliklerini tekrar çalıştırılabilir biçimde hazırlamaktadır.

## Kapsam

Bu adapter, Trendyol Product V2 ürün create akışı ile V1/V2 fiyat-stok batch endpointi için
canonical mapping ve kontrollü yayın altyapısı sağlar. `FEATURE_MARKETPLACE_TRENDYOL=false`
varsayılandır: bu modda hiçbir Trendyol isteği atılmaz ve sonuç `PREVIEW`/`MOCK-...` olur.

## Doğrulanan resmi kaynaklar

23 Ağustos 2026 tarihinde şu resmi dokümanlar kontrol edilmiştir:

- [Product V2 API endpoint](https://developers.trendyol.com/tr/v2.0/docs/product-v2-api-endpoint):
  ürün gönderimi `POST /integration/product/sellers/{sellerId}/v2/products` yolunu kullanır.
- [Product Create V2](https://developers.trendyol.com/tr/v2.0/docs/product-create-v2): category, brand,
  zorunlu attribute, barkod, fiyat, stok, KDV ve HTTPS görsel gereksinimlerini açıklar.
- [Authorization](https://developers.trendyol.com/v2.0/docs/authorization): Basic auth, seller'a özel
  API key/secret, zorunlu `User-Agent` ve ortam başına farklı credential kurallarını açıklar.
- [Price and inventory update](https://developers.trendyol.com/v2.0/docs/stock-and-price-update-updatepriceandinventory):
  batch fiyat/stok güncelleme sınırlarını açıklar.
- [Webhook model](https://developers.trendyol.com/v2.0/docs/webhook-model): event teslimi ve imza/doğrulama
  modelini açıklar.

Bu bağlantılar provider sözleşmesinin kaynağıdır; canlı aktivasyondan önce tekrar kontrol edilmelidir.

## Mapping kuralları

- `priceMinor` integer TRY minor-unit olarak tutulur ve payload'a iki ondalıklı TRY sayısı olarak
  dönüştürülür; float hesaplama yapılmaz.
- `availableStock`, on-hand, safety stock ve aktif reservation'lardan merkezi inventory kuralıyla
  hesaplanır.
- Category, brand ve ürün attribute mapping'leri olmadan satır yayınlanmaz.
- Barkod boşluk içeremez; yalnız doğrulanan sayısal/izinli karakter kümesi kullanılır.
- Ürün başlığı, açıklaması, stock code, KDV, TRY para birimi, fiyat ve product main id provider
  çağrısından önce doğrulanır.
- Görsel URL'leri HTTPS ve public erişilebilir olmalıdır; sahte placeholder URL üretilmez.

## Connection kurulumu

1. Onaylı reseller/BOTH organizasyonunda `/panel/entegrasyonlar` açın.
2. Seller ID, API key, API secret ve isteğe bağlı webhook API key'i girin. Alanlar kaydedildikten
   sonra yeniden gösterilmez.
3. Platform yöneticisi category, brand ve attribute mapping'lerini tamamlar.
4. Preview JSON'u inceleyin; geçersiz satırlar sıfır olmadan canlı flag açılmaz.
5. Stage credential ile `Bağlantıyı test et` çağrısını doğrulayın.
6. Sadece değişiklik yönetimi onayıyla `FEATURE_MARKETPLACE_TRENDYOL=true` verin ve production
   credential'ına geçin.

## Gerekli environment değişkenleri

- `DATA_ENCRYPTION_KEY`: en az 32 karakterli, staging/production secret manager'da tutulan anahtar.
- `FEATURE_MARKETPLACE_TRENDYOL`: varsayılan `false`; canlı Trendyol çağrısını açan tek flag.
- `S3_PUBLIC_BASE_URL`: object key kullanılan public görseller için HTTPS CDN/public bucket tabanı.
- `APP_URL`: HTTPS public origin; relative public görseli mutlaklaştırmak için kullanılır.

Seller ID ve API credential'ları repository veya `.env.example` içine yazılmaz; connection kaydında
şifreli tutulur. Rotation için yeni değerleri girin; eski değeri silmek için yalnız boş form
göndermek yerine disconnect kullanın.

## Sorun giderme ve geri alma

- `CATEGORY_MAPPING_MISSING`, `BRAND_MAPPING_MISSING` veya `ATTRIBUTE_MAPPING_MISSING`: admin
  mapping'ini tamamlayın; retry öncesi preview tekrar alın.
- `PUBLIC_IMAGE_REQUIRED`: ürüne gerçek public HTTPS görsel ekleyin veya uygun public base URL
  tanımlayın.
- `RATE_LIMITED`/geçici provider hatası: job retry/backoff kaydını inceleyin; aynı idempotency key
  ile kullanıcıdan yeniden yayın istemeyin.
- Canlı aktarımı durdurmak için flag'i `false` yapın. Yeni çağrı olmaz; mevcut katalog, sipariş ve
  stock ledger değişmez. Gerekirse connection disconnect ile credential cipher'ını kaldırın.

## Bilinen eksikler

V2 canlı credential doğrulaması, gerçek provider status polling, provider'a özgü webhook event
işleme, fiyat/stok batch activation ve operasyonel retry worker'ı pilot sonrasına bırakılmıştır.
