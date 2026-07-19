# FAZ 7 — HARİCİ ENTEGRASYON ADAPTÖRLERİ

## Amaç

Canlı anahtar olmadan güvenli adaptör mimarisi ve sandbox/mock davranışları oluşturmak; yalnız mevcut ticari hesap varsa seçili tek gerçek sağlayıcıyı entegre etmek.

## Kapsam

- MarketplacePaymentProvider,
- ShippingProvider,
- MarketplaceChannelAdapter,
- InvoiceProvider,
- credential encryption/redaction,
- webhook inbox/dedup/replay,
- connection health,
- sync jobs,
- güncel resmi API sürüm doğrulaması,
- Trendyol Product V2 mapping iskeleti,
- Hepsiburada/Amazon canonical mapping iskeleti,
- admin entegrasyon durumu,
- contract tests.

## Kural

Gerçek sağlayıcı seçimi ve credentials yoksa canlı çağrı yazıp “tamamlandı” deme. Mock ve contract testlerini tamamla; feature flag kapalı bırak.

## Kabul kriterleri

- provider değişimi domain kodunu değiştirmiyor,
- secrets client/log/admin düz metninde görünmüyor,
- webhook sahte imza/duplicate testleri geçiyor,
- retry/backoff var,
- güncel endpoint/sürüm kaynakları docs'a kaydedilmiş,
- canlı özellik flagsiz açılamıyor,
- kalite kapısı geçiyor.
