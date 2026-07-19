# KABUL VE TEST MATRİSİ

## Global kalite kapısı

Her faz için ilgili komutların başarılı olması gerekir:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

İlk fazlarda henüz bulunmayan komutlar faz kapsamında oluşturulmalıdır. E2E için gerekli hizmetler Docker Compose ile belgelenmelidir.

## Kritik senaryolar

| Alan | Başarı koşulu |
|---|---|
| Org izolasyonu | Org A kullanıcısı Org B kaynağını ID değiştirerek okuyamaz/yazamaz |
| Yetki | Rolü olmayan kullanıcı admin veya finans aksiyonu yapamaz |
| Para | Tüm hesaplar minor unit, deterministik yuvarlama |
| Stok | Eşzamanlı siparişlerde negatif stok oluşmaz |
| Checkout | Aynı idempotency key ikinci sipariş üretmez |
| Ödeme | Redirect tek başına ödeme başarısı sayılmaz |
| Webhook | Sahte imza reddedilir, tekrar event ikinci kez işlenmez |
| Sipariş | Geçersiz state transition engellenir |
| Dosya | Private erişim, tip/boyut kontrolü, signed URL |
| CSV | Formula injection güvenli |
| PII | Loglarda token, kart, tam adres, şirket belgesi yok |
| Responsive | 360 px ve masaüstü temel akışlar kullanılabilir |
| Erişilebilirlik | Klavye, focus, label ve hata ilişkileri çalışır |

## Pilot uçtan uca senaryo

1. Tedarikçi kayıt olur.
2. Şirket başvurusu yapar.
3. Admin onaylar.
4. Tedarikçi ürün, varyant, kademe fiyat ve stok ekler.
5. Alıcı işletme kayıt/onay sürecini tamamlar.
6. Ürünü arar ve sepete ekler.
7. MOQ ve stok doğrulanır.
8. Mock/manüel ödeme ile sipariş oluşur.
9. Tedarikçi kabul eder ve hazırlar.
10. Takip numarası ekler.
11. Alıcı durumu görür.
12. Taraflar sipariş konuşmasında mesajlaşır.
13. Audit log kritik aksiyonları gösterir.
