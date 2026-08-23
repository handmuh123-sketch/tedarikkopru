# Trendyol Canlıya Hazırlık

Canlı aktarım için aşağıdaki maddelerin tamamı gerekir:

- `FEATURE_MARKETPLACE_TRENDYOL=true` ve kontrollü release onayı,
- aktif ve platform tarafından `APPROVED` edilmiş `RESELLER` veya `BOTH` işletmesi,
- şifreli Trendyol seller ID, API key ve API secret bağlantısı,
- resmi Trendyol’dan alınmış (`LIVE`) kategori, marka ve attribute eşleşmeleri,
- aktif, stoklu favori varyant; geçerli barkod, SKU, TRY minor-unit fiyat ve public HTTPS görsel,
- Product V2 preview doğrulamasında hata olmaması.

Gerekli credential isimleri uygulama connection formunda tutulur: `sellerId`, `apiKey`,
`apiSecret`; isteğe bağlı olarak `shipmentAddressId`, `returningAddressId` ve webhook için ayrı
`webhookApiKey`. Bunlar environment, audit, export veya kullanıcı arayüzünde düz metin olarak
bulunmaz. Feature flag dışındaki credential’lar uygulama environment değişkeni değildir.

Pilot bu doğrulama ve preview/JSON export katmanını sunar. Gerçek provider metadata senkron
operasyonu, rate limit/backoff gözlemi ve canlı product publish için üretim yetkileri işletmeci
tarafından ayrıca tamamlanmalıdır.
