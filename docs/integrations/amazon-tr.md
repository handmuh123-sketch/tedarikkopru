# Amazon Türkiye adapter iskeleti

`AMAZON_TR` kanalı `MarketplaceChannelAdapter` sözleşmesini taşır ancak Faz 7A'da gerçek
credential, SP-API çağrısı veya network erişimi yoktur. Desteklenmeyen operasyonlar güvenli ve
deterministik `NOT_IMPLEMENTED` sonucu döndürür.

Canlı adaptör için Amazon SP-API authorization/refresh token modeli, Turkey marketplace kimliği,
Listings Items/Feeds model seçimi, ürün tipi tanımları, rate limit, restricted data, webhook/
notification güvenliği ve sandbox/rollout modeli resmi Amazon dokümanlarından ayrıca
doğrulanmalıdır.
