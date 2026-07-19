# FAZ 2 — KATALOG, FİYAT VE STOK

## Amaç

Onaylı tedarikçinin ürünleri yayınlayabilmesi, alıcının arayıp inceleyebilmesi ve stok/fiyat kurallarının güvenli çalışması.

## Kapsam

- kategori/marka,
- Product/ProductVariant/ProductImage,
- ürün moderasyonu,
- SKU/barkod,
- MOQ ve quantity step,
- kademe fiyat,
- Inventory/InventoryMovement,
- public katalog ve ürün detayı,
- PostgreSQL arama/filtre,
- favoriler,
- CSV/XLSX import önizleme ve hata raporu,
- injection-safe export,
- private/public görsel stratejisi,
- seed telefon aksesuarı örnekleri.

## Kabul kriterleri

- yalnız onaylı tedarikçi yayınlar,
- SKU benzersizliği ve negatif stok engeli,
- kademe fiyat ve MOQ testleri,
- ürün güncellemesi geçmiş sipariş modeli için snapshot yaklaşımını bozmuyor,
- import hataları satır bazında raporlanıyor,
- CSV formula injection testi,
- başka org ürünü değiştirilemiyor,
- responsive katalog akışı,
- kalite kapısı geçiyor.
