# Deployment temeli

Bu belge Faz 0 iskeletinin hedeflerini tanımlar; production yayını onaylamaz. Hukuk, KVKK, vergi, ödeme kuruluşu, güvenlik testi, yedek geri yükleme testi, admin 2FA ve production secret yönetimi tamamlanmadan canlıya çıkılmaz.

## Seçenek A — Tek container / VPS

1. `Dockerfile` ile immutable uygulama image'ı üret.
2. PostgreSQL'i tercihen yönetilen ve TLS zorunlu bir serviste çalıştır.
3. Private S3/R2 uyumlu object storage ve doğrulanmış e-posta sağlayıcısı seç.
4. Reverse proxy üzerinde TLS, istek boyutu sınırı ve güvenlik başlıklarını doğrula.
5. Migration'ı deployment öncesi tek seferlik job olarak çalıştır.
6. Uygulama, cron ve worker süreçlerini ayrı process olarak izle.
7. `/api/health/live` liveness; `/api/health/ready` readiness probe olarak kullan.

## Seçenek B — Next.js uyumlu yönetilen platform

1. Node.js 24 ve Next.js 16.2 desteği olan platform seç.
2. Managed PostgreSQL, private object storage ve cron/worker limitlerini doğrula.
3. `pnpm build` üretimini deploy et; migration'ı release job olarak çalıştır.
4. Background işleri request süresine bağlama; outbox processor ilgili fazda eklenir.
5. Platform preview ortamlarında production verisi veya secret kullanma.

## Zorunlu production kapıları

- `NODE_ENV=production`, HTTPS, secure cookie ve redirect/domain allowlist.
- En az 32 karakter auth, encryption ve cron secret değerleri; secret manager/KMS kullanımı.
- PostgreSQL TLS, otomatik yedek, point-in-time recovery ve belgelenmiş geri yükleme tatbikatı.
- Private object storage, en az yetkili erişim anahtarları ve erişim logları.
- Canlı ödeme/pazaryeri/kargo feature flag'leri sözleşme ve güvenlik onayı olmadan kapalı.
- E-posta domain doğrulaması, hata izleme, alarm, audit ayrımı ve veri saklama politikası.

## Backup / restore taslağı

Yedekler şifreli ve uygulama hesabından ayrı yetki alanında tutulmalıdır. Her release öncesi migration uyumluluğu kontrol edilir. Production'a geçmeden staging'de temiz bir PostgreSQL instance'ına restore yapılır; satır sayıları, migration durumu ve kritik bütünlük kontrolleri kayıt altına alınır. Faz 0 gerçek production verisi içermediği için otomatik backup işi kurulmamıştır.
