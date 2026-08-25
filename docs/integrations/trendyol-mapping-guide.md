# Trendyol Mapping Rehberi

## Güvenli akış

1. Bağlantı sahibi approved alıcı işletmesi için satıcı kimliği, API anahtarı ve API secret’ı
   `/panel/entegrasyonlar` ekranından kaydeder. Değerler yalnız şifreli connection alanında
   saklanır ve tekrar gösterilmez.
2. Katalog admini güncel resmi Trendyol kategori, attribute ve marka meta verisini cache’e alır.
   Canlı kaynak etiketi yalnız resmi provider cevabı ile yazılır.
3. `/admin/entegrasyonlar/trendyol` ekranında kaynak kategori/marka, doğru provider kaydına
   bağlanır. Yaprak olmayan kategori seçilmez; Product V2 için en alt kategori kullanılır.
4. Her ürün attribute anahtarı için ilgili kategori attribute’u ve gerekiyorsa değer eşleşmesi
   eklenir. `allowCustom` alanı yalnız provider meta verisi bunu izin veriyorsa custom değerle
   gönderilir.
5. Alıcı `/panel/favoriler` üzerinden stoklu ürün seçer, ardından kartlı önizlemeyi kontrol eder.
   Hatalı ürünler canlıya gönderilemez.

## Kaynak etiketleri

| Kaynak   | Preview | Live publish                                       |
| -------- | ------- | -------------------------------------------------- |
| `LIVE`   | Evet    | Diğer readiness koşulları da sağlanırsa evet       |
| `MANUAL` | Evet    | Hayır; resmi meta veriyle tekrar doğrulama gerekir |
| `MOCK`   | Evet    | Hayır                                              |

Category ID, brand ID veya attribute ID uydurulmaz. Provider meta verisi yokken yalnız güvenli
preview yapılır; gerçek aktarım kapalı kalır.
