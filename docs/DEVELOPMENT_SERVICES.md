# Development servisleri

Faz 0 yerel geliştirme ortamı PostgreSQL, MinIO ve Mailpit kullanır. Bütün portlar yalnız `127.0.0.1` üzerinde yayınlanır; yapılandırma production için kullanılmaz.

| Servis     | Sürüm                          | Bağlantı                                          | Amaç                           |
| ---------- | ------------------------------ | ------------------------------------------------- | ------------------------------ |
| PostgreSQL | 18.4 Alpine                    | `localhost:5432`                                  | Ana veri kaynağı               |
| MinIO      | `RELEASE.2025-10-15T17-29-55Z` | API `localhost:9000`, konsol `localhost:9001`     | S3 uyumlu development depolama |
| Mailpit    | 1.30.0                         | SMTP `localhost:1025`, UI `http://localhost:8025` | Development e-posta yakalama   |

## Neden MinIO image kaynak koddan üretiliyor?

MinIO'nun son resmi güvenlik sürümü `RELEASE.2025-10-15T17-29-55Z` bir yetki yükseltme açığını kapattı. Proje bu sürüm için resmi prebuilt Docker image yayımlamadı ve kaynak repo 2026'da arşivlendi. Bu nedenle `infra/minio/Dockerfile`, resmi release etiketini kaynak koddan derler; eski `minio/minio` image'ı kullanılmaz. Bu seçim yalnız development içindir. Production object storage sağlayıcısı Faz 8'de yeniden değerlendirilecektir.

## Komutlar

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres minio mailpit
docker compose down
```

Veri volume'ları `docker compose down` ile silinmez. `docker compose down -v` veri kaybettirir ve bu nedenle normal akışta kullanılmamalıdır.

Container ve HTTP sağlık kontrolleri:

```bash
docker compose ps
curl --fail http://localhost:9000/minio/health/live
curl --fail http://localhost:9000/minio/health/ready
curl --fail http://localhost:9001
curl --fail http://localhost:8025/livez
curl --fail http://localhost:8025/readyz
```

Mailpit Compose healthcheck'i resmi `/readyz` endpointini kullanır. MinIO konsolunun `9001`, Mailpit UI'ın `8025` üzerinde açılması yalnız UI erişimini; storage için ayrıca imzalı S3 put/get, e-posta için ayrıca SMTP teslimi doğrulanmalıdır.

## Hazırlık

PostgreSQL healthy olduktan sonra:

```bash
pnpm db:migrate
pnpm db:seed
pnpm test:integration
```

Uygulama storage/e-posta adaptörleri sonraki ilgili fazların işidir. Faz 0 incelemesinde servislerin kendisi için geçici bir MinIO SigV4 bucket/object put/get ve Mailpit SMTP/UI smoke testi yapıldı; bu testler ürün adaptörü veya iş akışı eklemez.
