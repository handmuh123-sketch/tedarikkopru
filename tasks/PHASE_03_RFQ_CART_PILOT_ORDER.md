# FAZ 3 — RFQ, SEPET VE PİLOT SİPARİŞ

## Amaç

Alıcı işletmenin ürün/teklif üzerinden tek tedarikçili sipariş oluşturabildiği ilk gerçek uçtan uca pilot akışı.

## Kapsam

- RFQ ve teklif,
- tek tedarikçili sepet,
- adres snapshot,
- MOQ/step/minimum tutar,
- fiyat/vergi/toplam hesaplama,
- stok rezervasyonu ve expiration job,
- mock ödeme,
- manuel banka transferi ödeme kaydı ve admin doğrulaması,
- checkout idempotency,
- Order/OrderItem/StatusHistory,
- alıcı sipariş ekranı,
- ödeme adaptör arayüzü.

## Kabul kriterleri

- eşzamanlı stok testinde oversell yok,
- başarısız/zaman aşan ödeme rezervasyonu bırakıyor,
- tekrar idempotency key yeni sipariş üretmiyor,
- redirect ödeme başarısı sayılmıyor,
- sipariş snapshot immutable,
- tek tedarikçi kuralı UI ve server'da,
- RFQ kabulü sepete dönüşebiliyor,
- pilot E2E sipariş oluşumuna kadar geçiyor,
- kalite kapısı geçiyor.
