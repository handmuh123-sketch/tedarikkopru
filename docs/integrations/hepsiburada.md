# Hepsiburada adapter iskeleti

`HEPSIBURADA` kanalı `MarketplaceChannelAdapter` sözleşmesini taşır ancak Faz 7A'da gerçek
credential, endpoint, payload veya network çağrısı yoktur. Tüm desteklenmeyen işlemler
deterministik `NOT_IMPLEMENTED` sonucu verir.

Canlı geliştirme başlamadan önce resmi seller API sürümü, authentication, rate limit, product
schema, category/brand/attribute mapping, görsel kuralları, webhook signature ve sandbox
davranışı resmi Hepsiburada kaynaklarından yeniden doğrulanmalıdır. Ardından ayrı feature flag,
credential rotasyonu, contract testleri ve rollout planı eklenir.
