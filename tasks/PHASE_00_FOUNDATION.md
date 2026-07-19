# FAZ 0 — FOUNDATION

## Amaç

Geliştirilebilir, test edilebilir, güvenli varsayımlara sahip çalışan proje iskeleti oluşturmak.

## Önce oku

- `AGENTS.md`
- `DECISIONS.md`
- `docs/PRODUCT_AND_TECH_SPEC.md`: teknik mimari, güvenlik, deployment ve test bölümleri
- `docs/ACCEPTANCE_AND_TEST_MATRIX.md`

## Kapsam

- Git repo ve başlangıç checkpoint'i.
- Uyumlu güncel kararlı Node/Next.js/React/Prisma sürümlerinin resmi dokümanla doğrulanması.
- pnpm ve TypeScript strict.
- Next.js App Router iskeleti.
- PostgreSQL + Prisma.
- Docker Compose: PostgreSQL, MinIO, Mailpit.
- Environment validation ve `.env.example`.
- temel klasör/modül sınırları.
- structured logging ve request ID temeli.
- health/readiness endpoint.
- temel tasarım tokenları ve örnek responsive ana sayfa.
- Vitest, integration test altyapısı, Playwright.
- lint, typecheck, test, build scriptleri.
- CI workflow.
- README: sıfırdan çalıştırma.
- `PROJECT_STATUS.md` güncelleme.

## Dahil değil

Auth, gerçek ürün CRUD, ödeme, kargo, canlı entegrasyon.

## Kabul kriterleri

- Temiz makinede belgelenmiş komutlarla servisler ayağa kalkar.
- Uygulama ana sayfası açılır.
- DB bağlantısı ve health endpoint çalışır.
- MinIO/Mailpit development bağlantıları yapılandırılmıştır.
- Örnek birim, entegrasyon ve E2E test geçer.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` başarılıdır.
- Secret commit edilmemiştir.
- `.agent/execplan.md`, README ve PROJECT_STATUS günceldir.
- Codex bu faz sonunda durur.
