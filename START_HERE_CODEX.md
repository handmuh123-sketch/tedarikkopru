# START HERE — CODEX

Bu klasör sıfırdan geliştirilecek **TedarikKöprü** projesinin talimat paketidir.

## Okuma sırası

1. `AGENTS.md`
2. `DECISIONS.md`
3. `.agent/PLANS.md`
4. Aktif `tasks/PHASE_XX_*.md`
5. Aktif fazın işaret ettiği `docs/PRODUCT_AND_TECH_SPEC.md` bölümleri
6. `docs/ACCEPTANCE_AND_TEST_MATRIX.md`
7. Gerekiyorsa `research/SOURCES_AND_FRESHNESS.md`

## Çalışma ilkesi

Bütün ürünü tek seferde yapma. Bir çalışmada yalnız bir faz uygula. Her faz:

- plan,
- küçük ve gözlemlenebilir adımlar,
- çalışan kod,
- migration,
- seed,
- test,
- dokümantasyon,
- kalite komutları,
- sonuç raporu

ile tamamlanır.

## İlk iş

Aktif görev `tasks/PHASE_00_FOUNDATION.md` dosyasıdır.

Önce:

- repo durumunu incele,
- Git yoksa başlat,
- `.agent/execplan.md` oluştur,
- teknik sürümleri resmi dokümanlardan doğrula,
- yalnız Faz 0'ı uygula,
- bütün kalite kontrollerini çalıştır,
- bir sonraki faza geçmeden dur.

## Bağlayıcı kaynak sırası

Çelişki olursa:

1. kullanıcının son açık talimatı,
2. aktif faz görev dosyası,
3. `DECISIONS.md`,
4. `AGENTS.md`,
5. `docs/PRODUCT_AND_TECH_SPEC.md`,
6. diğer dokümanlar.

## Gerçek servisler

API anahtarları yoksa mock/sandbox kullan. Canlı servis entegrasyonunu tamamlanmış gibi gösterme. Eksikleri açıkça `PROJECT_STATUS.md` ve `.agent/execplan.md` içine yaz.
