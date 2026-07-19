# TEK DOSYALIK CODEX BAŞLATICI

Bu dosya yalnız başlangıç içindir. En güvenilir yöntem ZIP paketini klasöre çıkarıp Codex'te klasörü açmaktır.

## İlk talimat

AGENTS.md, START_HERE_CODEX.md, DECISIONS.md, .agent/PLANS.md, PROJECT_STATUS.md, tasks/PHASE_00_FOUNDATION.md ve bu fazın işaret ettiği ürün şartnamesi bölümlerini oku.

Yalnız Faz 0'ı uygula; sonraki fazlara geçme.

Önce repo ve çalışma ortamını incele. `.agent/execplan.md` oluştur ve yaşayan plan olarak güncelle. Teknik sürümleri resmi dokümanlardan doğrula ve birbirleriyle uyumlu kararlı sürümleri seç. Uygulamayı çalışan bir iskelet halinde kur, gerekli test/kalite komutlarını oluştur, çalıştır ve hataları düzelt. Kullanıcının mevcut dosyalarını silme. Canlı servis veya secret kullanma.

Fazın kabul kriterleri sağlandığında dur. Son raporda yapılanları, değişen dosyaları, komut sonuçlarını, uygulamayı nasıl açacağımı, bilinen eksikleri ve önerilen sonraki fazı yaz.

## Paket dosya listesi

- `.agent/PLANS.md`
- `00_BURADAN_BASLA.md`
- `AGENTS.md`
- `DECISIONS.md`
- `PROJECT_STATUS.md`
- `START_HERE_CODEX.md`
- `docs/ACCEPTANCE_AND_TEST_MATRIX.md`
- `docs/PRODUCT_AND_TECH_SPEC.md`
- `prompts/01_FIRST_RUN.txt`
- `prompts/01_FIRST_RUN_GOAL.txt`
- `prompts/02_REVIEW_PHASE.txt`
- `prompts/03_NEXT_PHASE.txt`
- `prompts/04_FIX_QUALITY_GATE.txt`
- `research/SOURCES_AND_FRESHNESS.md`
- `tasks/PHASE_00_FOUNDATION.md`
- `tasks/PHASE_01_IDENTITY_ORGANIZATIONS.md`
- `tasks/PHASE_02_CATALOG_INVENTORY.md`
- `tasks/PHASE_03_RFK_CART_PILOT_ORDER.md`
- `tasks/PHASE_04_ORDER_SHIPPING_NOTIFICATIONS.md`
- `tasks/PHASE_05_RETURNS_DISPUTES_MESSAGING.md`
- `tasks/PHASE_06_ADMIN_ANALYTICS_PILOT.md`
- `tasks/PHASE_07_EXTERNAL_INTEGRATION_ADAPTERS.md`
- `tasks/PHASE_08_SECURITY_LEGAL_DEPLOYMENT.md`

## Not

Ürün ayrıntıları `docs/PRODUCT_AND_TECH_SPEC.md` içindedir. Codex bir çalışmada yalnız bir `tasks/PHASE_XX_*.md` dosyasını uygulamalıdır.
