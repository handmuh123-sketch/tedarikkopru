# Staging deployment hazırlığı

Bu belge staging için çalıştırılabilir release runbook'udur; gerçek cloud sağlayıcısı seçmez
ve production yayını onaylamaz. Staging, production'dan ayrı domain, secret, PostgreSQL,
bucket ve e-posta hesabı kullanır. Canlı ödeme, banka, kargo ve pazaryeri feature flag'leri
kapalı kalır.

## Önerilen mimari

1. TLS reverse proxy veya platform ingress yalnız `443` portunu internete açar; uygulama
   container'ı private networkte `3000` portunda çalışır.
2. `Dockerfile`, Next.js `output: "standalone"` runtime image'ı üretir. `node server.js`,
   `HOSTNAME=0.0.0.0` ve platformun verdiği `PORT` ile başlar; app container'ına volume
   bağlanmaz ve bir staging replikası yeterlidir.
3. Ayrı PostgreSQL servisi kalıcı disk, otomatik yedek ve TLS kullanır. Migration için
   uygulama runtime image'ı değil, kaynak kodu, `prisma` CLI'ı ve `prisma/migrations`
   klasörünü içeren tek release job kullanılır.
4. Doğrulanmış SMTP hizmeti ve private S3 uyumlu object storage ayrı servislerdir. MinIO
   Compose servisi development içindir; staging'de kullanılırsa PostgreSQL'den bağımsız,
   şifreli ve yedeklenen kalıcı volume gerekir.

## Ortam değişkenleri

Staging ve production değerleri secret manager'da tutulur; `.env.example` deploy edilmez.
Boş değerler yalnız ilgili feature kapalıysa kabul edilir.

| Grup                 | Gerekli değerler                                                                                                                                                   | Kural                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Çalışma zamanı       | `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `APP_URL`, `APP_TIMEZONE`                                                                                         | `APP_URL` public HTTPS origin olmalı; path eklemeyin. Production'da `DEPLOYMENT_ENV=production` zorunludur.                                                                                                       |
| PostgreSQL           | `DATABASE_URL`, `DIRECT_URL`                                                                                                                                       | Uygulama bağlantısı ve release/migration için doğrudan TLS bağlantısı ayrı tanımlanır. Şema `public`, kullanıcı en az yetkili olmalıdır.                                                                          |
| Uygulama secret'ları | `AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET`                                                                                                                | Birbirinden farklı, en az 32 karakterli, placeholder olmayan secret manager değerleri gerekir.                                                                                                                    |
| Object storage       | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET_PRIVATE`, `S3_BUCKET_PUBLIC`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`                                       | İki bucket deploy öncesi oluşturulur. Uygulama rolü private bucket için `HeadBucket`, `GetObject`, `PutObject` erişimi alır; public erişim verilmez. S3/R2 için çoğunlukla `false`, MinIO için `true` kullanılır. |
| E-posta              | `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_SMTP_REQUIRE_TLS`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD` | Production Node runtime SMTP ve kimlik bilgisini fail-fast zorunlu tutar. `465` için secure TLS; `587` için STARTTLS zorunluluğu sağlayıcıyla doğrulanır. `resend` değişkeni henüz adaptör değildir.              |
| Seed                 | `DEMO_SEED_ENABLED`, isteğe bağlı demo parolaları                                                                                                                  | Normal staging runtime `false` kullanır. Demo yalnız açıkça seçilmiş staging seed job'ında açılır; production deployment demo seed çalıştırmaz.                                                                   |
| Feature flags        | Tüm `FEATURE_*`, `PAYMENT_PROVIDER=mock`                                                                                                                           | Canlı entegrasyonlar `false` kalır. Pilot banka transferi açılırsa hesap adı/IBAN ayrı secret olarak gerekir.                                                                                                     |
| Operasyon            | `DOCUMENT_MAX_BYTES`, isteğe bağlı `SENTRY_DSN`                                                                                                                    | Sentry değişkeni şu an rezerve konfigürasyondur; aktif hata-izleme adaptörü değildir.                                                                                                                             |

## Release sırası

1. CI, bağımlılıkları lockfile ile kurar; `pnpm typecheck` ve `pnpm build` geçmeden image
   yayınlanmaz. Build için Dockerfile'ın build-only değişkenleri kullanılır; runtime secret
   image içine yazılmaz.
2. Staging secret manager'a yukarıdaki değerler girilir. `APP_URL`, reverse proxy'nin public
   HTTPS domain'iyle birebir eşleşir.
3. PostgreSQL yedeği ve migration etkisi gözden geçirilir. Tek release runner şu sırayı
   çalıştırır:

   ```bash
   pnpm db:validate
   pnpm db:migrate
   pnpm exec prisma migrate status
   ```

   `pnpm db:migrate`, Prisma `migrate deploy` kullanır. `migrate dev`, `db push` ve
   `migrate reset` staging/production'da kullanılmaz; migration geçmişi değiştirilmez.

4. Uygulama image'ı runtime değişkenleriyle başlatılır; release job ve web process aynı anda
   migration çalıştırmaz.
5. Reverse proxy arkasından şu smoke kontrolleri yapılır:

   ```bash
   curl --fail --show-error https://staging.example/api/health/live
   curl --fail --show-error https://staging.example/api/health/ready
   ```

   Liveness yalnız process'i, readiness PostgreSQL `SELECT 1` bağlantısını kontrol eder.
   Object storage ve SMTP readiness'e dahil değildir; deploy sonrası private bucket put/get ve
   doğrulanmış alıcıya e-posta smoke'u ayrıca yapılır.

## Seed ve veri sınırı

`pnpm db:seed` teknik system setting kayıtlarını idempotent günceller. `DEPLOYMENT_ENV=production`
altında demo hesap oluşturmaz; production release pipeline'ı bu komutu otomatik çalıştırmaz.
Staging demo verisi gerçekten gerekirse ayrı, onaylı tek seferlik job'da
`NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `DEMO_SEED_ENABLED=true` ve secret manager
demo parolalarıyla çalıştırılır. Normal staging deploy'inde `DEMO_SEED_ENABLED=false` kalır.
Demo seed müşteri veya production verisiyle asla aynı veritabanında kullanılmaz.

## Reverse proxy ve kalıcılık

- HTTP'yi HTTPS'e yönlendirin; upstream `Host`, `X-Forwarded-Proto: https`,
  `X-Forwarded-For` ve mümkünse proxy request ID'sini iletsin. Uygulamanın HSTS, CSP ve
  secure cookie ayarları public `APP_URL` ile çalışır.
- İstek gövdesi sınırı belge yükleme üst sınırından (`DOCUMENT_MAX_BYTES`) biraz büyük,
  timeout'lar upload akışına uygun olmalıdır. App portu, PostgreSQL, S3 ve SMTP internete
  doğrudan açılmaz.
- Kalıcı disk yalnız PostgreSQL ile self-hosted object storage için gerekir; application
  container, Next cache dışında iş verisi tutmaz. Staging tek replikada çalışır. Çoklu
  replica/CDN öncesinde Next.js cache koordinasyonu ayrıca tasarlanmalıdır.
- PostgreSQL ve object storage için şifreli yedek, geri yükleme tatbikatı ve erişim logları
  gerçek production kapısıdır.

## Production kapıları

Staging hazır olmak production onayı değildir. Hukuk/KVKK, mali süreçler, ödeme kuruluşu,
güvenlik/pentest, admin 2FA, gözlemlenebilirlik/alarm, backup restore tatbikatı ve canlı
sağlayıcı sözleşmeleri tamamlanmadan production deploy yapılmaz.
