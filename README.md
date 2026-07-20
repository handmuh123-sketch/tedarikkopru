# TedarikKöprü

Türkiye odaklı B2B tedarikçi pazaryerinin Faz 2A hızlı pilot uygulamasıdır. Faz 1 kimlik/işletme güvenliği üzerine kategori, marka, temel toptan fiyat/MOQ içeren ürün-varyant modeli, tedarikçi ürün ekranı, admin moderasyonu ve public telefon aksesuarı kataloğu eklenmiştir. Stok, kademe fiyat, import/export, sepet, sipariş, ödeme, kargo ve canlı entegrasyonlar henüz yoktur.

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
- Ürün moderasyonu: <http://localhost:3000/admin/urunler>
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

## Faz 1 demo hesapları

`.env.example` içindeki `DEMO_SEED_ENABLED=true` yalnız development ortamında aşağıdaki localhost hesaplarını idempotent oluşturur. Seed production ortamında demo hesap oluşturmaz; parolalar veritabanında Better Auth scrypt hash'i olarak tutulur.

- Platform admini: `admin@demo.tedarikkopru.local` / `Faz1-Admin-Demo-2026!`
- Tedarikçi: `tedarikci@demo.tedarikkopru.local` / `Faz1-Isletme-Demo-2026!`
- Alıcı: `alici@demo.tedarikkopru.local` / `Faz1-Isletme-Demo-2026!`

Kayıt e-postaları, parola sıfırlama ile üyelik davetleri development ortamında Mailpit'e gider. İşletme belgesi PDF/JPEG/PNG ve en fazla 5 MB olmalıdır; private MinIO bucket'tan yalnız yetkili uygulama endpoint'i üzerinden okunur.

Seed ayrıca `Demo Mobil Tedarik` adlı doğrulanmış tedarikçi, telefon aksesuarı kategori ağacı, üç marka ve dört yayındaki demo ürün oluşturur. Demo tedarikçi hesabıyla ürün oluşturup moderasyona gönderebilir; demo admin hesabıyla `/admin/urunler` üzerinden yayınlayabilirsiniz.

Diğer Faz 0 komutları:

```bash
pnpm jobs:work
pnpm openapi:generate
pnpm db:validate
pnpm services:validate
```

OpenAPI çıktısı `docs/openapi.json` dosyasına deterministik olarak yazılır. Faz 0 worker komutu yalnız process/logging temelini doğrular; ürün işi tüketmez.

## Güvenli varsayımlar

`.env.example` içindeki tüm kimlik bilgileri yalnız localhost development örneğidir ve canlı secret değildir. Gerçek `.env` dosyası Git tarafından yok sayılır. Runtime her ortamda en az 32 karakterli auth ve veri şifreleme anahtarı ister; `NODE_ENV=production` olduğunda localhost arkasında dahi bilinen development/build placeholder secret'ları reddedilir. `pnpm build` yalnız derleme süresinde runtime-only kontrolleri ayrı bir compile bağlamıyla atlar; çalışan production sunucusu bu istisnayı kullanmaz. Vergi numarası AES-256-GCM ile şifreli ve HMAC hashli, reset/doğrulama/davet tokenları hashli saklanır. Tüm canlı ödeme, kargo ve pazaryeri bayrakları kapalıdır.

Development servislerinin sürüm ve güvenlik ayrıntıları için [docs/DEVELOPMENT_SERVICES.md](docs/DEVELOPMENT_SERVICES.md), yayın sınırları için [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) dosyasına bakın.
