# FAZ 4 — TEDARİKÇİ SİPARİŞİ, KARGO VE BİLDİRİMLER

## Amaç

Tedarikçinin siparişi kabul edip hazırlaması, manuel kargo oluşturması ve alıcının süreci takip etmesi.

## Kapsam

- merkezi order state machine,
- tedarikçi sipariş paneli,
- kabul/ret ve nedenler,
- handling/SLA tarihleri,
- hazırlama ve gönderim,
- ManualShippingProvider,
- Shipment/ShipmentEvent,
- takip URL'si,
- sipariş konuşması,
- uygulama içi ve e-posta işlem bildirimleri,
- outbox/job retry,
- admin operasyon görünümü.

## Kabul kriterleri

- geçersiz durum geçişi engelleniyor,
- ödeme öncesi teslimat adresi tedarikçiye açılmıyor,
- kargo olayları idempotent,
- bildirim retry'si siparişi iki kez değiştirmiyor,
- yeni siparişten teslimata Pilot E2E geçiyor,
- SLA gecikmeleri görünür,
- kalite kapısı geçiyor.
