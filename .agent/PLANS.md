# EXECUTION PLANS STANDARD

Aktif plan `.agent/execplan.md` dosyasında tutulur. Plan yaşayan belgedir; yalnız başlangıçta yazılıp bırakılmaz.

## Zorunlu şablon

```markdown
# Faz XX — <başlık>

## Amaç ve kullanıcı sonucu
Bu faz bittiğinde kullanıcı ne yapabilecek?

## Başlangıç durumu
Repo, çalışan özellikler, bilinen problemler ve ön koşullar.

## Kapsam
### Dahil
### Dahil değil

## Bağlayıcı kararlar
Aktif görev ve DECISIONS.md referansları.

## Teknik kararlar
- Karar:
- Gerekçe:
- Alternatif:
- Sonuç:

## Güvenlik ve veri etkisi
Yetki, PII, ödeme, stok, migration, dosya veya webhook etkileri.

## Uygulama adımları
- [ ] Gözlemlenebilir adım
- [ ] Testiyle birlikte adım

## Dosya değişiklikleri
Oluşturulacak/değişecek yollar.

## Migration ve geri dönüş
Forward migration, backfill ve güvenli geri dönüş yaklaşımı.

## Test planı
- birim
- entegrasyon
- E2E
- güvenlik
- manuel doğrulama

## Kabul kriterleri
Aktif faz görev dosyasından kopyalanmış ölçülebilir koşullar.

## İlerleme günlüğü
- YYYY-MM-DD HH:mm:
  - Yapılan:
  - Kanıt:
  - Sonraki:

## Sürprizler ve öğrenilenler
Başarısız denemeler dahil.

## Sonuç
Tamamlananlar, test çıktıları, bilinen eksikler ve sonraki faz.
```

## Kurallar

- Faz başlamadan oluştur/güncelle.
- Her önemli adım sonrası checkbox ve ilerleme günlüğünü güncelle.
- Plan gerçek uygulamadan saparsa önce planı düzelt.
- Komut çıktısını özetle; başarısız komutları saklama.
- Faz sonu raporu kanıtlanabilir olmalı.
