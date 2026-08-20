# Faz 3C — RFQ / Teklif Talebi Pilotu

Bu yürütme planı yalnız Faz 3C kapsamındadır. Faz 3A, Faz 3B-1 ve Faz 3B-2
akışları korunacaktır.

## Amaç

Alıcıların tek bir ürün varyantı ve hedef tedarikçi için teklif talebi
oluşturabildiği; tedarikçilerin teklif verip alıcıların teklifi idempotent
olarak kabul veya reddedebildiği güvenli pilot akışını tamamlamak.

## Kapsam

- RFQ ve teklif veri modeli, ileriye dönük PostgreSQL migration'ı
- Alıcı RFQ oluşturma, listeleme ve detay görünümü
- Tedarikçi gelen RFQ listesi, detay görünümü ve teklif verme
- Alıcı teklif listesi, detay görünümü, kabul/ret kararı
- Organizasyon kapsamlı RBAC/BOLA, durum geçmişi ve audit kayıtları
- Mevcut ürün/sepet akışına kabul edilmiş tekliften basit bağlantı
- Hedefli unit, PostgreSQL integration, Chrome masaüstü ve 360 px E2E

## Kapsam Dışı

- Karşı teklif/pazarlık, mesajlaşma, ek, çoklu tedarikçi ve açık artırma
- Kargo, iade/refund, banka transferi, gerçek ödeme sağlayıcısı ve fatura
- Faz 3C dışındaki özellikler veya tam regresyon

## Uygulama Adımları

1. Mevcut checkpoint ve faz bağlamı doğrulandı.
2. RFQ/teklif şeması, migration'ı ve durum kuralları eklendi.
3. Merkezi RFQ servisleri ile org-scoped API route'ları eklendi.
4. Alıcı ve tedarikçi pilot ekranları mevcut panel/ürün akışına bağlandı.
5. Hedefli testler çalıştırıldı; yalnız E2E ortamındaki origin ve tekrar çalıştırılabilir demo parola eşitlemesi düzeltildi.
6. Migration/seed ve durum belgeleri tamamlanmış gerçek durumla güncellendi.

## Doğrulama Sonuçları

- Aynı idempotency anahtarı ikinci teklif veya karar geçmişi üretmedi; gerçek PostgreSQL integration testi bunu doğruladı.
- Farklı alıcı/tedarikçi organizasyonlarının RFQ ve teklif erişimi 404 ile engellendi.
- Birim fiyat TRY integer minor unit, DB CHECK ile pozitif ve `TRY` olarak saklanır.
- Teklif kabul/red durumları RFQ ve teklif geçmişi ile audit loguna tek transaction içinde yazılır.
- Kabul edilen teklif alıcıyı mevcut ürün detayına, oradan sepet akışına bağlar.
- Prisma schema/client, forward migration ve tekrar çalıştırılabilir demo seed başarılı oldu.
- Faz 3C unit 3/3, PostgreSQL integration 2/2, Chrome masaüstü 2/2 ve 360 px mobil 2/2 geçti.
- Hedefli ESLint, strict typecheck ve `git diff --check` başarılı oldu.

## Durum

- Tamamlandı — Faz 3C RFQ / teklif talebi pilotu tamamlandı.
