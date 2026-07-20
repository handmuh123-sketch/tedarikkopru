# Faz 00 — Foundation

## Amaç ve kullanıcı sonucu

Bu faz bittiğinde geliştirici; belgelenmiş komutlarla yerel PostgreSQL, MinIO ve Mailpit servislerini başlatabilecek, Prisma migration/seed çalıştırabilecek, responsive Türkçe ana sayfayı açabilecek ve uygulamanın canlılık/hazırlık durumunu API üzerinden doğrulayabilecektir. Proje lint, strict typecheck, birim, entegrasyon, E2E ve production build kalite kapılarına sahip olacaktır.

## Başlangıç durumu

- Repo yalnız ürün/talimat belgelerinden oluşuyordu; uygulama kodu, paket manifesti, lockfile ve environment örneği yoktu.
- Dış çalışma kökünde aynı adlı iç proje klasörü bulunuyor; gerçek repo kökü bu planın bulunduğu klasördür.
- Git ve Node.js sistem `PATH`'inde yoktu; doğrulama için resmi taşınabilir Git 2.55.0.windows.3 ve Node.js 24.18.0 dış proje klasöründeki `.tools` altında hazırlandı.
- İlk uygulama turunda Docker Engine kullanılamıyordu. Bağımsız Faz 0 incelemesi sırasında Docker Desktop 4.82.0 / Engine 29.6.1 / Compose v5.3.0 kullanılabilir hâle geldi; Compose servisleri ve uygulama image'ı gerçek runtime ile doğrulandı.
- İlk Git checkpoint'i `5f1ff2e` (`chore: preserve initial project brief`) olarak oluşturuldu.
- Canlı ödeme, kargo, e-posta veya pazaryeri kimlik bilgisi yok ve Faz 0 kapsamında kullanılmayacak.

## Kapsam

### Dahil

- pnpm + lockfile, Next.js App Router, React, strict TypeScript, Tailwind CSS ve ESLint iskeleti.
- PostgreSQL + Prisma başlangıç şeması, migration ve idempotent seed.
- PostgreSQL, MinIO ve Mailpit için Docker Compose; development bağlantı değişkenleri.
- Zod ile fail-fast environment doğrulaması ve güvenli `.env.example`.
- Modüler monolit klasör sınırları ve dış servis port/adaptör temelleri.
- Pino structured logging, hassas alan redaction ve request ID temeli.
- Liveness ve DB kontrollü readiness endpointleri.
- Token tabanlı, responsive, doğal Türkçe örnek ana sayfa.
- Vitest birim testi, PostgreSQL entegrasyon testi ve Playwright E2E testi.
- Lint, format, typecheck, test, integration, E2E, build, migration, seed, worker ve OpenAPI scriptleri.
- CI workflow, README ve PROJECT_STATUS güncellemesi.

### Dahil değil

- Auth, kullanıcı/işletme onboarding'i ve RBAC.
- Gerçek ürün CRUD, fiyatlandırma, stok, sepet, ödeme, sipariş veya kargo akışları.
- Canlı servis/secret kullanımı ve gerçek entegrasyonların açılması.
- Faz 1 ve sonrasındaki veri modeli ya da iş kuralları.

## Bağlayıcı kararlar

- `tasks/PHASE_00_FOUNDATION.md` yalnız çalışan ve test edilebilir temel iskeleti ister; bu plan Faz 1'e geçmez.
- `DECISIONS.md` D-008 uyarınca responsive web, modüler monolit, Next.js App Router, PostgreSQL, Prisma, Docker ve mock-first adaptörler kullanılacaktır.
- `DECISIONS.md` D-005 ve D-007 uyarınca canlı ödeme/entegrasyonlar kapalı kalacaktır.
- `AGENTS.md` uyarınca Server Components varsayılan, secret'lar server-only, loglar yapılandırılmış ve hassas alanlardan arındırılmış olacaktır.
- Şartname §7, §8, §13–16, §23–25 ve Faz 0 sınırları uygulanacaktır.

## Teknik kararlar

- Karar: Node.js `24.18.0` LTS seçildi.
  - Gerekçe: Node.js resmi sürüm sayfasında v24 LTS, v26 ise Current; üretim uygulamaları için LTS öneriliyor. Next.js 16 en az Node 20.9, Prisma 7 ise Node `^24.0.0` destekliyor.
  - Alternatif: Node.js 22 Maintenance LTS.
  - Sonuç: Güncel LTS hattı ve tüm seçili araçlarla uyumluluk.
- Karar: Next.js `16.2.10` ve React/React DOM `19.2.7` seçildi.
  - Gerekçe: Next.js resmi blogunda 16.2 kararlı seri, 16.3 ise Preview olarak yayımlanmış durumda. npm resmi kayıt etiketleri güvenlik yamalı 16.2.10 ve 19.2.7'yi gösteriyor; Next 16 React 19.2 ve Node 20.9+ ile uyumlu.
  - Alternatif: 16.3 Preview veya eski 15.x bakım hattı.
  - Sonuç: Preview özellikleri alınmadan güncel kararlı App Router hattı.
- Karar: Prisma ORM `7.8.0`, PostgreSQL 18.4 ve `@prisma/adapter-pg` kullanılacak.
  - Gerekçe: Prisma'nın resmi dokümanı v7 için driver adapter ve ESM zorunluluğunu, Node 24 desteğini ve PostgreSQL 18 desteğini belgeliyor; Prisma ekibi v7'yi üretim/LTS hattı olarak tanımlıyor.
  - Alternatif: Prisma 6 bakım hattı.
  - Sonuç: Yeni `prisma-client` generator ve `prisma.config.ts` yaklaşımı kullanılacak.
- Karar: pnpm `11.15.0`, TypeScript `5.9.x` kullanılacak ve exact sürümler lockfile ile sabitlenecek.
  - Gerekçe: pnpm 11 Node 22.13+ ister ve Node 24 ile uyumludur. Prisma v7 resmi yükseltme rehberi TypeScript 5.9.x'i önerir; TypeScript 7 yeni major olduğundan ekosistem uyumluluğu için bu fazda seçilmeyecektir.
  - Alternatif: pnpm 10 veya TypeScript 7.
  - Sonuç: Corepack `packageManager` alanı ve exact dependency sürümleri tekrarlanabilir kurulum sağlar.
- Karar: Readiness DB'ye gerçek `SELECT 1` uygular; liveness dış bağımlılıklardan bağımsızdır.
  - Gerekçe: Orkestratörün süreç canlılığı ile trafik kabulünü ayırması gerekir.
  - Alternatif: Tek, her zaman 200 dönen health endpoint.
  - Sonuç: `/api/health/live` ve `/api/health/ready` ayrı sözleşmelerdir.
- Karar: Entegrasyon testi gerçek PostgreSQL ister; servis yoksa açık bir ön koşul mesajıyla başarısız olur, sahte DB ile yeşile boyanmaz.
  - Gerekçe: Şartname §16.2 gerçek PostgreSQL ister.
  - Alternatif: SQLite/mock entegrasyon testi.
  - Sonuç: Docker Compose PostgreSQL 18.4 üzerinde migration, iki kez seed ve entegrasyon testleri çalıştırıldı.

### Doğrulanan resmi kaynaklar (20 Temmuz 2026)

- Node.js sürüm durumu: https://nodejs.org/en/about/previous-releases
- Next.js 16.2 kararlı duyurusu: https://nextjs.org/blog/next-16-2
- Next.js kurulum ve minimum sürümler: https://nextjs.org/docs/app/getting-started/installation
- React 19.2 ve güvenlik yama duyuruları: https://react.dev/blog/2025/10/01/react-19-2 ve https://react.dev/blog
- Prisma sistem gereksinimleri: https://docs.prisma.io/docs/orm/reference/system-requirements
- Prisma v7 yükseltme/ESM/adapter rehberi: https://www.prisma.io/docs/orm/v6/more/upgrades/to-v7
- Prisma desteklenen PostgreSQL sürümleri: https://docs.prisma.io/docs/orm/reference/supported-databases
- pnpm uyumluluk: https://pnpm.io/installation#compatibility
- Exact paket etiketleri: https://registry.npmjs.org/next/latest, https://registry.npmjs.org/react/latest, https://registry.npmjs.org/prisma/latest ve https://registry.npmjs.org/pnpm/latest

## Güvenlik ve veri etkisi

- Faz 0 şeması yalnız teknik `SystemSetting` kaydı içerir; PII, kimlik, ödeme, stok ve sipariş verisi yoktur.
- `.env` ve gerçek secret dosyaları Git dışındadır. `.env.example` yalnız açıkça yerel olduğu belirtilen, canlı olmayan development örnekleri taşır.
- Tüm canlı entegrasyon feature flag'leri varsayılan kapalıdır.
- Log redaction listesi authorization, cookie, token, parola, kart, VKN, IBAN ve adres alanlarını kapsar.
- Güvenlik başlıkları Next.js yanıtlarına merkezi olarak eklenir.
- Request ID yalnız geçerli, sınırlı karakter setindeki istemci değerini kabul eder; aksi halde sunucuda UUID üretir.
- Runtime production doğrulaması localhost arkasında dahi bilinen development/build placeholder secret'larını reddeder; yalnız derleme wrapper'ının açık `compile` bağlamı production-only kontrolleri atlar.
- Log redaction key adını case, camelCase ve nesting'den bağımsız normalize ederek hassas değerleri recursive olarak maskeler.
- Teknik DB timestamp kolonları timezone belirsizliğini önlemek için `timestamptz(3)` kullanır.

## Uygulama adımları

- [x] Talimatları, Faz 0 şartname bölümlerini, kabul matrisini ve mevcut dosyaları incele.
- [x] Resmi kaynaklardan teknoloji uyumluluğunu doğrula ve kararlı sürüm hattını seç.
- [x] Git deposunu başlat ve mevcut kullanıcı dosyalarını başlangıç checkpoint'i olarak kaydet.
- [x] Paket manifesti, strict TypeScript, lint/format ve Next.js App Router iskeletini kur; lockfile bağımlılık kurulumunda üretilecek.
- [x] Environment doğrulaması, güvenlik başlıkları, logging/request ID ve modül sınırlarını kur.
- [x] Prisma şeması, migration, seed ve PostgreSQL erişimini kur.
- [x] Docker Compose ile PostgreSQL, MinIO ve Mailpit development servislerini tanımla.
- [x] Responsive Türkçe ana sayfa ve health/readiness endpointlerini tamamla.
- [x] Örnek birim, entegrasyon ve E2E testlerini ekle.
- [x] CI, README, environment ve operasyon dokümantasyonunu tamamla.
- [x] Kalite komutlarını çalıştır, hataları düzelt ve sonuçları kaydet.
- [x] PROJECT_STATUS ve bu planı gerçek sonuçlarla kapat; Faz 1'e geçmeden dur.

## Dosya değişiklikleri

- Kök: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, Next/ESLint/Prettier/Vitest/Playwright yapılandırmaları, `.gitignore`, `.env.example`, `docker-compose.yml`, `Dockerfile`, `README.md`.
- Uygulama: `src/app/**`, `src/components/**`, `src/lib/**`, `src/modules/**`, `src/styles/**`.
- Veri: `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts`, `prisma.config.ts`.
- Test: `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`.
- Operasyon: `.github/workflows/ci.yml`, `scripts/**`, `docs/DEVELOPMENT_SERVICES.md`, `docs/DEPLOYMENT.md`, `docs/openapi.json`.
- Durum: `.agent/execplan.md`, `PROJECT_STATUS.md`.

## Migration ve geri dönüş

- İlk forward migration yalnız Faz 0 teknik modelini oluşturur.
- İlk migration geçmişi değiştirilmeden ikinci forward migration, UTC kabul edilen mevcut `timestamp` değerlerini `AT TIME ZONE 'UTC'` ile `timestamptz(3)` kolonlarına dönüştürür.
- Seed, sabit bir anahtar üzerinden upsert edilerek tekrar çalıştırılabilir olur.
- Geri dönüş development ortamında migration'ın oluşturduğu teknik tabloyu düşürmektir; kullanıcı/finans verisi olmadığı için iş verisi backfill'i yoktur. İkinci migration var olan teknik timestamp anlarını UTC olarak korur.
- Migration geçmişi üretildikten sonra düzenlenmeyecek; sonraki değişiklikler yeni migration ile yapılacaktır.

## Test planı

- Birim: env parsing, runtime/build ayrımı, production placeholder secret reddi, request ID doğrulama ve recursive hassas log alanı maskeleme.
- Entegrasyon: gerçek PostgreSQL üzerinde Prisma bağlantısı, seed kaydının okunması ve timezone-aware kolon tipleri.
- E2E: temiz Playwright sunucusunda masaüstü ve 360 px görünüm; ana içerik, landmark'lar, skip-link klavye akışı, liveness/güvenlik başlıkları ve gerçek DB readiness.
- Güvenlik: response header'ları, readiness hata cevabında ham DB/provider ayrıntısı sızmaması, log redaction.
- Manuel: production build, standalone üretim konteyneri liveness/readiness çağrıları; Compose servis health durumları, MinIO imzalı S3 put/get ve Mailpit SMTP/UI smoke.

## Kabul kriterleri

- [x] Temiz makinede belgelenmiş komutlarla servisler ayağa kalkar.
- [x] Uygulama ana sayfası açılır.
- [x] DB bağlantısı ve health endpoint çalışır.
- [x] MinIO/Mailpit development bağlantıları yapılandırılmıştır.
- [x] Örnek birim, entegrasyon ve E2E test geçer.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` başarılıdır.
- [x] Secret commit edilmemiştir.
- [x] `.agent/execplan.md`, README ve PROJECT_STATUS günceldir.
- [x] Codex bu faz sonunda durur.

Compose sözleşmesi Docker Compose v5.3.0 ile `config --quiet` kullanılarak doğrulandı. PostgreSQL 18.4, MinIO ve Mailpit container'ları `healthy` oldu; PostgreSQL migration/seed/integration, MinIO SigV4 put/get, Mailpit SMTP/API/UI ve standalone uygulama liveness/readiness smoke testleri gerçek runtime üzerinde geçti.

## İlerleme günlüğü

- 2026-07-20 00:52 +03:00:
  - Yapılan: Talimatlar ve ilgili şartname bölümleri okundu; boş repo, eksik yerel araçlar ve iç içe repo kökü tespit edildi. Resmi sürüm kaynakları doğrulandı. Taşınabilir Node/Git hazırlandı, Git başlatıldı ve başlangıç checkpoint'i alındı.
  - Kanıt: `node --version` → `v24.18.0`; `git --version` → `2.55.0.windows.3`; commit → `5f1ff2e`.
  - Sonraki: pnpm'i etkinleştirip exact paket sürümlerini çözmek ve uygulama iskeletini oluşturmak.
- 2026-07-20 01:18 +03:00:
  - Yapılan: Exact npm sürümleri çözüldü; Next/React/Prisma iskeleti, env validation, Prisma migration/seed, Compose servisleri, güvenlik başlıkları, request ID/logging, ana sayfa ve üç test katmanı eklendi.
  - Kanıt: `package.json`, `src/`, `prisma/`, `docker-compose.yml`, `tests/` ve `.github/workflows/ci.yml` oluşturuldu.
  - Sonraki: Bağımlılıkları kurup lockfile/OpenAPI üretmek; tüm statik ve çalışan kalite kontrollerindeki hataları düzeltmek.
- 2026-07-20 12:02 +03:00:
  - Yapılan: Frozen lockfile kurulumu tamamlandı; README/operasyon belgeleri ve CI kapatıldı. PostgreSQL 18.4 migration/seed, readiness HTTP, unit/integration/E2E testleri, Compose config ve production build doğrulandı. E2E Türkçe `İ/i` case-fold eşleşmesi exact erişilebilir ad ile düzeltildi.
  - Kanıt: format/lint/typecheck başarılı; unit 7/7, integration 2/2, E2E 4/4; `/api/health/ready` → `200 ready`; `pnpm build` başarılı; Compose v5.1.4 config başarılı.
  - Sonraki: Faz 0 sonunda dur. Yeni talimat verilirse önerilen kapsam Faz 1 kimlik/işletme/rol temelidir.
- 2026-07-20 13:45 +03:00:
  - Yapılan: Faz 0 değişiklikleri kabul matrisiyle bağımsız incelendi. Production placeholder secret bypass'ı, derin log PII redaction açığı, timezone'suz teknik timestamp kolonları, stale-server E2E riski, landmark/focus erişilebilirliği, Mailpit healthcheck ve eksik container build/runtime kanıtı düzeltildi. İlk migration değiştirilmeden yeni forward migration eklendi.
  - Kanıt: format/lint/typecheck başarılı; unit 9/9, integration 3/3, E2E 6/6; iki ardışık seed başarılı; Docker Compose servisleri healthy; PostgreSQL/MinIO/Mailpit smoke testleri ve `8025`/`9001` tarayıcı kontrolleri başarılı; OpenSSL/CA paketli `tedarikkopru-app:latest` build başarılı; standalone liveness/readiness `200`; `pnpm build` başarılı; OpenAPI çift üretim SHA-256 eşit.
  - Sonraki: Faz 0 sonunda dur. Faz 1 yalnız yeni kullanıcı talimatıyla başlayabilir.

## Sürprizler ve öğrenilenler

- Verilen çalışma kökü gerçek repo yerine onu içeren aynı adlı dış klasördü; uygulama gerçek iç klasörde kurulacak.
- Sistem `PATH`'inde Node, Git ve Docker yoktu. Proje dışındaki `.tools` ile sistem kurulumuna dokunmadan Node/Git sağlandı.
- İlk Git arşivi ağ zaman aşımında eksik kaldı; resmi varlık yeniden indirilip başarıyla açıldı.
- Sandbox kullanıcısı klasör sahibinden farklı olduğu için Git `safe.directory` istedi; global ayar yerine yalnız komut bazında güvenli dizin verildi.
- MinIO'nun son resmi security release'i için prebuilt resmi Docker image yayımlanmadığı ve repo 2026'da arşivlendiği doğrulandı. Bilinen açığı taşıyan eski image yerine resmi release kaynağını derleyen development Dockerfile seçildi.
- ESLint 10 ile React/import/a11y plugin peer aralıkları uyumsuzdu; güncel uyumlu ESLint 9.39.2 seçildi ve sıfır uyarı kapısı korundu.
- pnpm 11 bağımlılık build scriptlerini varsayılan olarak engelledi; yalnız Prisma engine/client, esbuild, sharp ve resolver paketleri `allowBuilds` ile açıkça izinlendi.
- OneDrive dosya sistemi Next.js ilk development derlemesini yavaşlattı; E2E seri worker ve 60 saniyelik açık timeout ile deterministik hale getirildi.
- JavaScript'in Unicode case-insensitive regex'i Türkçe büyük `İ` harfini beklenen biçimde eşleştirmedi; erişilebilir başlık exact Türkçe adıyla doğrulandı.
- Docker Engine olmamasına rağmen sahte DB kullanılmadı; resmi PostgreSQL 18.4 Windows binary arşiviyle localhost test sunucusu kuruldu, tüm DB kontrollerinden sonra durduruldu.
- Docker Desktop daha sonra kullanılabilir hâle gelince tüm Compose runtime kabulleri tekrarlandı. MinIO'nun ilk kaynak build'i bu makinede yaklaşık 11 dakika, uygulama image build'i registry hızı nedeniyle yaklaşık 5–6 dakika sürdü.
- Prisma, ilk slim image build'inde OpenSSL sürümünü saptayamadı; `ca-certificates` ve `openssl` taban imaja eklenince uyarı kayboldu ve standalone runtime gerçek PostgreSQL'e karşı geçti.
- Ham `JSON.stringify` çıktısı ile Prettier biçimi arasındaki fark CI'da OpenAPI drift'i üretecekti; generator Prettier ile kanonik çıktı yazacak şekilde düzeltildi ve ardışık iki üretimin SHA-256 değeri eşleşti.

## Sonuç

Faz 0 kapsamı tamamlandı ve Faz 1'e geçilmedi. Repo; responsive/klavye erişilebilir ana sayfa, gerçek PostgreSQL migration/seed/readiness, çalışan MinIO/Mailpit Compose servisleri, runtime-safe environment/logging/request ID temeli, üç test katmanı, CI ve sıfırdan kurulum belgesiyle çalışan bir iskelettir. Docker Compose servisleri, storage/e-posta smoke akışları, üretim image build'i ve standalone uygulama runtime'ı gerçek ortamda doğrulandı. Kalan düşük riskler CSP `unsafe-inline` sıkılaştırması ve yerel TLS zinciri nedeniyle tamamlanamayan dependency audit'idir; Faz 1 kapsamı bu incelemeye alınmadı.
