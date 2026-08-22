# TedarikKöprü

Türkiye odaklı B2B tedarikçi pazaryerinin hızlı pilot uygulamasıdır. Onaylı katalog, stok ve immutable hareket defteri, tek tedarikçili sepet/checkout rezervasyonu, mock ödeme, tedarikçi kararları, RFQ/tekliften checkout'a fiyat bağlantısı, manuel kargo/teslimat, uygulama içi iade/refund ve admin onaylı manuel banka transferi içerir. Gerçek ödeme, banka, kargo, refund ve fatura sağlayıcısı entegrasyonları bilinçli olarak yoktur.

## Gereksinimler

- Node.js `24.18.0` LTS
- pnpm `11.15.0`
- Docker Engine/Desktop ve Docker Compose `2.24+`
- Git

Seçilen uygulama sürümleri `package.json` ve `pnpm-lock.yaml` içinde sabittir. Node ve pnpm sürümlerini doğrulayın:

```bash
node --version
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm --version
```

## Sıfırdan yerel kurulum

Önce bu `README.md` dosyasının bulunduğu gerçek repo köküne geçin. PowerShell kullanıyorsanız environment örneğini şu komutla kopyalayın:

```powershell
Copy-Item .env.example .env
```

Bash/zsh karşılığı:

```bash
cp .env.example .env
```

Ardından bağımlılıkları ve development servislerini hazırlayın:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
docker compose config --quiet
docker compose up -d postgres minio mailpit
docker compose ps
pnpm db:migrate
pnpm db:seed
pnpm dev
```

MinIO image'ı güvenlik yamalı resmi release kaynağından üretildiği için ilk Compose build'i normalden uzun sürebilir; referans Windows/Docker Desktop ortamında yaklaşık 11 dakika sürdü. PostgreSQL `healthy` olmadan migration çalıştırmayın.

Uygulama açıldığında:

- Ana sayfa: <http://localhost:3000>
- Liveness: <http://localhost:3000/api/health/live>
- Readiness: <http://localhost:3000/api/health/ready>
- MinIO API/konsol: <http://localhost:9000> / <http://localhost:9001>
- Mailpit: <http://localhost:8025>
- Kayıt: <http://localhost:3000/kayit>
- Giriş: <http://localhost:3000/giris>
- İşletme paneli: <http://localhost:3000/panel>
- Doğrulama kuyruğu: <http://localhost:3000/admin/dogrulamalar>
- Public ürünler: <http://localhost:3000/urunler>
- Tedarikçi ürünleri: <http://localhost:3000/tedarikci/urunler>
- Tedarikçi stokları: <http://localhost:3000/tedarikci/stok>
- CSV/XLSX import ve CSV export: <http://localhost:3000/tedarikci/import>
- Favoriler: <http://localhost:3000/panel/favoriler>
- Ürün moderasyonu: <http://localhost:3000/admin/urunler>
- Admin import işleri: <http://localhost:3000/admin/importlar>
- Sipariş/iade operasyonları: <http://localhost:3000/admin/operasyonlar>
- Banka transferi operasyonları: <http://localhost:3000/admin/odemeler>
- Alıcı siparişleri ve iade talebi: <http://localhost:3000/panel/siparisler>
- Alıcı RFQ/teklifleri: <http://localhost:3000/panel/teklif-talepleri>
- Tedarikçi sipariş, kargo ve teslimat: <http://localhost:3000/tedarikci/siparisler>
- Tedarikçi iade talepleri: <http://localhost:3000/tedarikci/iadeler>
- Tedarikçi RFQ/teklifleri: <http://localhost:3000/tedarikci/teklifler>
- Kategori/marka: <http://localhost:3000/admin/kategoriler> / <http://localhost:3000/admin/markalar>

Readiness, PostgreSQL erişilemiyorsa kasıtlı olarak `503 not_ready` döndürür. Liveness dış bağımlılıklardan bağımsızdır.

Development servislerinin HTTP smoke kontrolleri:

```bash
curl --fail http://localhost:9000/minio/health/live
curl --fail http://localhost:9000/minio/health/ready
curl --fail http://localhost:9001
curl --fail http://localhost:8025/livez
curl --fail http://localhost:8025/readyz
```

Servisleri durdurmak için:

```bash
docker compose down
```

Bu komut volume verilerini silmez. `docker compose down -v` yerel veriyi siler ve normal akışta kullanılmamalıdır.

## Staging deployment

Staging, uygulamanın internete açık fakat production verisinden, secret'ından ve ödeme
sağlayıcısından tamamen ayrı ortamıdır. Yerel `docker-compose.yml` yalnız development
içindir; staging'de uygulama Docker image'ı, ayrı PostgreSQL, private S3 uyumlu object
storage ve doğrulanmış SMTP hizmeti kullanılır. Uygulama image'ı `output: "standalone"`
ile üretilir; uygulama container'ı stateless kalır.

Staging secret manager'ında en az şunları tanımlayın:

- `NODE_ENV=production`, `DEPLOYMENT_ENV=staging` ve HTTPS public origin olan `APP_URL`.
- Ayrı ve TLS zorunlu PostgreSQL için `DATABASE_URL` (uygulama bağlantısı) ile
  `DIRECT_URL` (migration/release bağlantısı).
- En az 32 karakterli, gerçek ve birbirinden farklı `AUTH_SECRET`,
  `DATA_ENCRYPTION_KEY`, `CRON_SECRET`.
- Private bucket'a erişebilen S3 endpoint/region/bucket/access key/secret key değerleri.
- Doğrulanmış SMTP için `EMAIL_PROVIDER=smtp`, gönderici, host, port, TLS ayarları ve
  SMTP kullanıcı/parolası.

Staging runtime'da `DEMO_SEED_ENABLED=false` kullanın. Demo veri gerekirse yalnız açıkça
onaylanmış ve `DEPLOYMENT_ENV=staging` olan tek seferlik seed job'ında açılır; production
deploy'i `DEPLOYMENT_ENV=production` ile demo seed'ini koşulsuz engeller. Migration'ı app
container'ından ayrı, tek release job olarak `pnpm db:migrate` ile çalıştırın; `db:push`,
`migrate dev` veya reset staging/production'da kullanılmaz. Ardından public domain üzerinden
`/api/health/live` ve `/api/health/ready` kontrollerini yapın.

TLS reverse proxy yalnız HTTPS'i internete açmalı; upstream'e `Host`,
`X-Forwarded-Proto: https`, `X-Forwarded-For` ve istek boyutu sınırlarını iletmelidir.
`APP_URL` proxy'nin public domain'iyle tam eşleşmelidir; böylece trusted origin ve secure
cookie ayarları doğru çalışır. Ayrıntılı değişken matrisi, release sırası, kalıcı veri ve
geri alma kuralları için [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) dosyasını izleyin.

### Render Blueprint ile staging deploy

Repository kökündeki `render.yaml`, Frankfurt bölgesinde `tedarikkopru` adlı ücretsiz Docker
web servisini oluşturur; Render Dockerfile'ı, liveness kontrolünü ve güvenli varsayılanları
otomatik uygular. Blueprint, Docker image'ındaki yerel `3000` varsayımını ezerek Render'ın
beklediği `PORT=10000` üzerinde dinlemeyi açıkça ayarlar. Yalnız şu adımlar gerekir:

1. GitHub repository'yi seçin.
2. Render Dashboard'da Blueprint'i oluşturun.
3. İlk oluşturma iletişim kutusunda yalnız `sync: false` değerlerini girin.
4. Deploy edin.

`APP_URL` Render'ın public HTTPS origin'i olmalıdır. Render Free planında pre-deploy release
komutu yoktur; yeni staging veritabanında veya migration değiştiğinde deploy'dan önce güvenilir
source+CLI release runner ile `pnpm db:migrate` çalıştırın. `migrate dev`, `db push`, reset ve
otomatik demo seed kullanmayın.

## Kalite ve test komutları

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e:install
pnpm test:e2e
pnpm build
docker compose build app
```

Entegrasyon testi gerçek PostgreSQL ve MinIO ister; önce servisleri, migration'ı ve seed'i çalıştırın. E2E ayrıca Mailpit SMTP/API akışını kullanır. Playwright varsayılan olarak kendi temiz development sunucusunu başlatır ve eski bir `localhost:3000` sürecini başarı saymaz. Yalnız bilinçli yerel hata ayıklamada mevcut sunucuyu kullanmak için `PLAYWRIGHT_REUSE_EXISTING_SERVER=true` verilebilir. Playwright varsayılan olarak kurduğu Chromium'u kullanır. Kurulu Microsoft Edge'i özellikle kullanmak isterseniz PowerShell'de testten önce `$env:PLAYWRIGHT_CHANNEL="msedge"` ayarlayabilirsiniz.

## Demo hesapları

`.env.example` içindeki `DEMO_SEED_ENABLED=true` yalnız development ortamında aşağıdaki localhost hesaplarını idempotent oluşturur. Staging demo seed'i yalnız `DEPLOYMENT_ENV=staging` ile açıkça seçilen tek seferlik job'da kullanılabilir; `DEPLOYMENT_ENV=production` demo hesap oluşturmaz. Parolalar veritabanında Better Auth scrypt hash'i olarak tutulur.

- Platform admini: `admin@demo.tedarikkopru.local`
- Tedarikçi: `tedarikci@demo.tedarikkopru.local`
- Alıcı: `alici@demo.tedarikkopru.local`

Parolalar yalnız yerel `.env` içindeki `DEMO_ADMIN_PASSWORD` ve
`DEMO_USER_PASSWORD` değerlerinden gelir. Bunları kaynak koda, test çıktısına,
loglara veya Git'e yazmayın.

Kayıt e-postaları, parola sıfırlama ile üyelik davetleri development ortamında Mailpit'e gider. İşletme belgesi PDF/JPEG/PNG ve en fazla 5 MB olmalıdır; private MinIO bucket'tan yalnız yetkili uygulama endpoint'i üzerinden okunur.

Seed ayrıca `Demo Mobil Tedarik` adlı doğrulanmış tedarikçi, telefon aksesuarı kategori ağacı, üç marka, dört yayındaki demo ürün ve safety stock üstü demo stokları oluşturur. Demo tedarikçi ürün/stok, RFQ, sipariş, kargo ve iade akışlarını yönetebilir; demo alıcı RFQ, sepet, checkout, ödeme, teslimat ve iade akışlarını deneyebilir; demo admin doğrulama, katalog/import, ödeme ve operasyon kuyruklarını görür.

Diğer Faz 0 komutları:

```bash
pnpm jobs:work
pnpm openapi:generate
pnpm db:validate
pnpm services:validate
```

OpenAPI çıktısı `docs/openapi.json` dosyasına deterministik olarak yazılır. Faz 0 worker komutu yalnız process/logging temelini doğrular; ürün işi tüketmez.

## Güvenli varsayımlar

`.env.example` içindeki tüm kimlik bilgileri yalnız localhost development örneğidir ve canlı secret değildir. Gerçek `.env` dosyası Git tarafından yok sayılır. Runtime her ortamda en az 32 karakterli auth ve veri şifreleme anahtarı ister; `NODE_ENV=production` olduğunda localhost arkasında dahi bilinen development/build placeholder secret'ları reddedilir. `pnpm build` yalnız derleme süresinde runtime-only kontrolleri ayrı bir compile bağlamıyla atlar; çalışan production sunucusu bu istisnayı kullanmaz. Vergi numarası AES-256-GCM ile şifreli ve HMAC hashli, reset/doğrulama/davet tokenları hashli saklanır. Mock ödeme ve manuel banka transferi yalnız pilot feature flag'leriyle kullanılabilir; tüm canlı ödeme, kargo ve pazaryeri bayrakları kapalıdır.

## Production öncesi dış işler

- Gerçek kart/ödeme gateway'i ve banka transfer reconciliation.
- Gerçek kargo/iade kargo API'leri, etiket/barkod ve takip webhook'ları.
- Gerçek refund sağlayıcısı, e-fatura/e-arşiv ve mali süreçler.
- Production mail/object storage, deployment secret'ları, observability ve alerting.
- KVKK saklama/anonimleştirme, hukuk ve pilot kategori onayları.

Development servislerinin sürüm ve güvenlik ayrıntıları için [docs/DEVELOPMENT_SERVICES.md](docs/DEVELOPMENT_SERVICES.md), yayın sınırları için [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) dosyasına bakın.
