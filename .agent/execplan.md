# Faz 02A — Katalog Pilot Çekirdeği

## Amaç ve kullanıcı sonucu

Bu hızlı pilot dilimi tamamlandığında doğrulanmış tedarikçi tek varyantlı temel toptan ürün oluşturup düzenleyebilecek ve moderasyona gönderebilecek; platform admini ürünü onaylayabilecek veya gerekçeyle reddedebilecek; ziyaretçi yalnız onaylı ürünleri responsive liste ve detay sayfalarında görebilecektir.

## Başlangıç durumu

- Faz 1 checkpoint'i `17b7e81` (`feat: complete phase 1 identity and organizations`) ve temiz çalışma ağacı doğrulandı.
- Auth, organization, üyelik rolleri, doğrulanmış işletme durumu, audit ve admin yetkisi çalışıyor.
- Kategori, marka ve ürün modeli/ekranı henüz yok; PostgreSQL, MinIO ve Mailpit mevcut Compose servislerinde çalışıyor.
- Kullanıcının FAST PILOT MVP talimatı tüm Faz 2 yerine yalnız katalog ilk yarısını bağlar.

## Kapsam

### Dahil

- Kategori ve marka yönetimi için admin API/ekranı ve development seed verisi.
- `Product`, `ProductVariant`, `ProductImage`; integer minor-unit temel TRY toptan fiyat, MOQ ve quantity step.
- Doğrulanmış SUPPLIER/BOTH organizasyonunda server-side RBAC ile ürün oluşturma/düzenleme ve moderasyona gönderme.
- Admin ürün kuyruğu, onay ve gerekçeli ret; kritik işlemlerde redacted audit.
- Yalnız `ACTIVE` ürünleri sunan public `/urunler` ve `/urunler/[slug]` sayfaları.
- Telefon aksesuarı demo kategori, marka ve ürünleri.

### Dahil değil

- Inventory, stok rezervasyonu/hareketi, PriceTier/kademe fiyat, CSV/XLSX, gelişmiş arama/filtre, favoriler.
- Sepet, checkout, ödeme, sipariş, kargo, pazaryeri entegrasyonu ve Faz 3+.
- Harici görsel URL fetch'i veya kapsamlı medya yönetimi.

## Bağlayıcı kararlar

- Kullanıcının daraltılmış Faz 2A listesi, `tasks/PHASE_02_CATALOG_INVENTORY.md` içindeki daha geniş Faz 2 kapsamının önüne geçer.
- Para integer kuruş olarak saklanır; float hesap yapılmaz. Currency her varyantta bulunur.
- Her ürün sorgusu tedarikçi organization scope'u taşır; public sorgu yalnız `ACTIVE` ürünü döndürür.
- Yalnız `ACTIVE` + `APPROVED` SUPPLIER/BOTH organizasyonu ürünü moderasyona gönderebilir; taslak oluşturma/düzenleme org rolüyle sınırlandırılır.
- Migration geçmişi değiştirilmez; yeni forward migration eklenir.

## Teknik kararlar

- Karar: Pilot fiyatı `ProductVariant.priceAmountMinor` ve `currency` alanlarında tut.
  - Gerekçe: Bu dilimde yalnız tek temel fiyat isteniyor; PriceTier ve dönemsel fiyat altyapısı Faz 2B kapsamı.
  - Alternatif: Şimdiden Price/PriceTier geçmiş modeli kurmak.
  - Sonuç: Görünür akış küçük kalır; sonraki dilimde forward migration ile fiyat geçmişine taşınabilir.
- Karar: Ürün görselleri yalnız güvenilir uygulama-local `storageKey` değerlerinden seed edilir; kullanıcıdan URL alıp server-side fetch yapılmaz.
  - Gerekçe: Pilot görsel akışını SSRF ve upload moderasyon altyapısı eklemeden güvenli tutar.
  - Alternatif: Public object upload.
  - Sonuç: `ProductImage` modeli ve public sunum çalışır; kullanıcı upload'ı bilinen eksik kalır.
- Karar: Ürün durum geçişleri küçük bir catalog state machine servisinde tutulur.
  - Gerekçe: Tedarikçi submit ve admin approve/reject kuralları route/UI içine dağılmaz.
  - Sonuç: Geçersiz geçişler birim ve entegrasyon testine açıktır.

## Güvenlik ve veri etkisi

- Ürün mutation'ları membership + organization filtreli tek kaynak erişimiyle BOLA'ya kapalıdır; public response supplier özel verilerini içermez.
- Kategori/marka ve moderasyon işlemleri platform admin yetkisi ister.
- Fiyat pozitif integer minor unit; MOQ ve quantity step pozitif integer ve MOQ step ile uyumlu doğrulanır.
- Admin ret notu kullanıcı çıktısında düz metin olarak gösterilir fakat audit payload'ında yalnız `noteProvided` tutulur.
- Migration yalnız yeni enum/tablo/index/constraint ekler; Faz 1 verisini silmez.

## Uygulama adımları

- [x] Bağlayıcı belgeleri, Faz 2 ilgili şartname bölümlerini ve temiz Faz 1 checkpoint'ini doğrula.
- [x] Prisma katalog modelleri ve forward migration oluştur; client üret ve gerçek PostgreSQL'e uygula.
- [x] Katalog validation/state machine, RBAC, tedarikçi CRUD/submit ve admin yönetim/moderasyon API'lerini kur.
- [x] Tedarikçi ürün formu/listesi, admin kategori-marka/ürün ekranları ve public katalog ekranlarını tamamla.
- [x] Telefon aksesuarı kategori/marka/ürün seed'ini idempotent ve development-only ekle.
- [x] İlgili unit ve gerçek PostgreSQL integration testlerini çalıştır.
- [x] Ürün oluşturma, admin onayı ve public görüntüleme kritik E2E akışını çalıştır.
- [x] PROJECT_STATUS ve bu planı gerçek sonuçlarla kapat; Faz 2B'ye geçmeden dur.

## Dosya değişiklikleri

- Veri: `prisma/schema.prisma`, yeni `prisma/migrations/**`, `prisma/seed.ts`.
- Domain/API: `src/modules/catalog/**`, `src/app/api/v1/products/**`, `src/app/api/v1/admin/{products,categories,brands}/**`.
- UI: `src/app/tedarikci/urunler/**`, `src/app/admin/{urunler,kategoriler,markalar}/**`, `src/app/urunler/**`, ilgili components/styles.
- Test/belge: ilgili `tests/unit`, `tests/integration`, `tests/e2e`, `.agent/execplan.md`, `PROJECT_STATUS.md`, `README.md` gerektiği kadar.

## Migration ve geri dönüş

- Yeni migration katalog enum ve tablolarını FK/unique/check constraintleriyle ekler; mevcut migration dosyalarına dokunmaz.
- Ürün SKU benzersizliği `(supplier_organization_id, sku)` üzerinde DB constraint ile korunur.
- Geri dönüş yalnız pilot katalog tablolarını bağımlılık sırasıyla kaldırır; veri varsa otomatik destructive rollback uygulanmaz.

## Test planı

- Birim: fiyat/MOQ/step şeması ve ürün moderasyon state machine'i.
- Entegrasyon: gerçek PostgreSQL'de doğrulanmış tedarikçi create/update/submit, başka org update reddi, admin role bypass, approve/reject ve public yalnız-active görünürlük.
- E2E: demo tedarikçi ürün oluşturur, admin onaylar, ziyaretçi liste ve detayda görür.
- Bu hızlı dilimde Faz 1 tam regresyonu, tüm E2E matrisi, production build ve Docker image build tekrarlanmaz.

## Kabul kriterleri

- [x] Kategori ve marka admin tarafından yönetilebilir.
- [x] Doğrulanmış tedarikçi temel fiyat/MOQ/step içeren ürün oluşturup düzenleyebilir.
- [x] Başka organizasyon ürün değişikliği ID değişimiyle yapılamaz.
- [x] Admin ürünü onaylayabilir veya gerekçeyle reddedebilir; yetkisiz kullanıcı yapamaz.
- [x] Public liste/detay yalnız aktif ürünleri gösterir ve responsive çalışır.
- [x] Telefon aksesuarı demo ürünleri seed edilir.
- [x] İlgili lint, typecheck, unit, integration ve kritik E2E testleri geçer.
- [x] Faz 2B kapsamı uygulanmadan durulur.

## İlerleme günlüğü

- 2026-07-20 17:10 +03:00:
  - Yapılan: Faz 1 checkpoint'i ve temiz ağaç doğrulandı; Faz 2 görev/şartname, güvenlik ve test kuralları okundu; dar Faz 2A teknik sınırları donduruldu.
  - Kanıt: `17b7e81`; `git status` temiz; bu yaşayan plan.
  - Sonraki: Forward migration ve katalog domain/API çekirdeği.
- 2026-07-20 17:53 +03:00:
  - Yapılan: Faz 2A migration, katalog domain/API/UI, admin taksonomi ve moderasyon, public katalog ve telefon aksesuarı seed'i tamamlandı. Katalog admin yetkisi şartnameye göre yalnız PLATFORM_ADMIN/SUPER_ADMIN rollerine daraltıldı.
  - Kanıt: Hedefli lint/typecheck başarılı; unit 2/2; gerçek PostgreSQL integration 3/3; kritik Playwright 1/1. Migration başarılı, seed iki kez idempotent çalıştı.
  - Sonraki: Faz 2A sonunda dur. Faz 2B yalnız yeni kullanıcı talimatıyla başlayabilir.

## Sürprizler ve öğrenilenler

- Geniş Faz 2 görevinde stok, tier fiyat, arama ve import birlikte bulunuyor; son kullanıcı talimatı bunları açıkça sonraki Faz 2B'ye bıraktığı için veri modeli yalnız geriye dönük güvenli genişleme noktalarını koruyacak.
- OneDrive'da ilk Next route derlemesi 20 saniyeyi aşabildi; kritik E2E API response'unu doğrudan bekleyerek yanlış negatiften arındırıldı. İlk iki koşu UI hydration/zamanlama ve liste-detay locator belirsizliğini yakaladı; uygulama ve test birlikte düzeltildi.
- Playwright development sunucusunu zorla kapatırken `Connection closed` ve Prisma PostgreSQL adapter'ında pg@9 öncesi deprecation uyarısı görüldü; test sonucu ve veri işlemleri başarılı, canlı istek sırasında hata yok.

## Sonuç

Faz 2A hızlı pilot kapsamı tamamlandı. Doğrulanmış tedarikçi ürün oluşturma/düzenleme/submit, dar katalog admin RBAC'i, approve/reject, public yalnız-active liste/detay ve telefon aksesuarı seed'i ilgili testlerle doğrulandı. Faz 2B'ye geçilmedi.

---

# Arşiv — Faz 01 Kimlik, İşletmeler ve Doğrulama

## Amaç ve kullanıcı sonucu

Bu faz bittiğinde tedarikçi ve alıcı kullanıcılar e-posta/parola ile kayıt olabilecek, e-postalarını doğrulayabilecek, güvenli parola sıfırlama ve session yönetimi kullanabilecek; işletmelerini ve adreslerini oluşturup private belgelerle doğrulama başvurusu yapabilecektir. Yetkili platform admini, server-side rol kontrolü altında başvuruları inceleyip onaylayabilecek, değişiklik isteyebilecek veya reddedebilecektir. Tüm kritik üyelik, belge ve doğrulama işlemleri redacted audit kaydı üretecektir.

## Başlangıç durumu

- Faz 0 checkpoint'i `d509db9` (`feat: complete reviewed phase 0 foundation`) olarak temiz çalışma ağacında doğrulandı.
- 20 Temmuz 2026 başlangıç kalite turunda format, lint, strict typecheck, unit 9/9, gerçek PostgreSQL integration 3/3, Playwright E2E 6/6 ve `pnpm build` geçti.
- PostgreSQL, MinIO ve Mailpit Compose servisleri healthy. Docker image build başlangıç denemesi koddan önce Docker Desktop DNS çözümleme hatasıyla (`registry-1.docker.io`) durdu; önceden üretilmiş Faz 0 image'ı mevcut ve final kapıda build yeniden denenecek.
- Auth, User/Organization modelleri, onboarding, verification, private document ve admin queue henüz yoktur.
- Canlı e-posta, storage veya secret kullanılmayacak; Mailpit/MinIO ve development adapter'ları kullanılacaktır.

## Kapsam

### Dahil

- Better Auth ile e-posta/parola kayıt, email verification, giriş/çıkış, parola reset ve DB-backed session yönetimi.
- User, auth Account/Session/Verification, Organization, OrganizationMembership, OrganizationInvitation ve Address modelleri.
- SUPPLIER, RESELLER ve BOTH onboarding; kaydedilebilir işletme/adres/belge/inceleme akışı.
- Merkezi platform ve organization rol matrisi; deny-by-default server-side RBAC.
- VerificationApplication state machine ve admin doğrulama kuyruğu.
- Private MinIO belge yükleme/okuma; boyut, MIME, magic byte ve checksum doğrulaması; development malware scan adapter'ı.
- Hashlenmiş invitation/reset/verification belirteçleri ve DB-backed rate limit.
- Redacted immutable audit log ve development e-posta akışı.
- Güvenli, development-only demo seed kullanıcı/işletmeleri.
- Responsive ve klavye erişilebilir Türkçe auth/onboarding/panel/admin ekranları.
- Unit, gerçek PostgreSQL integration, Playwright E2E ve güvenlik testleri.

### Dahil değil

- Faz 2 katalog, fiyat, stok veya ürün moderasyonu.
- Sipariş, checkout, ödeme, kargo, RFQ ve diğer Faz 2+ domainleri.
- Canlı e-posta/storage sağlayıcısı, admin 2FA'nın tamamlanması veya production secret bootstrap.
- Virüs tarama motorunun canlı entegrasyonu; yalnız kapalı/geliştirme adapter sınırı.

## Bağlayıcı kararlar

- `tasks/PHASE_01_IDENTITY_ORGANIZATIONS.md`, şartname §3, §4.1–4.2, §6.2–6.6, §8, §9.1, §9.11 AuditLog, §10, §13, §16–17, §20–22 uygulanır.
- `AGENTS.md` gereği her org sorgusu organization filtresi içerir; yetkilendirme server-side ve deny-by-default'tur.
- `DECISIONS.md` gereği yalnız doğrulanmış B2B işletmeler ve mock-first local servisler kullanılır.
- Migration geçmişi değiştirilmez; Faz 1 yeni forward migration ekler.
- Faz 2 veya sonrası veri modeli/iş akışı eklenmez.

## Teknik kararlar

- Karar: Better Auth `1.6.23` ve resmi Prisma adapter kullanılacak.
  - Gerekçe: Resmî doküman Next.js 16, Prisma 7 custom client output, email/password, verification, reset ve güvenli session desteğini belgeliyor.
  - Alternatif: Auth.js veya tamamen özel auth.
  - Sonuç: Kimlik/session kriptografisi yeniden icat edilmeden güncel kararlı kütüphane kullanılır.
- Karar: Better Auth yalnız auth çekirdeğini yönetir; organization/membership/invitation özel domain servisidir.
  - Gerekçe: Kabul kriteri davet tokenının yalnız hash olarak saklanmasını ve özel verification state machine/rollerini gerektirir; organization plugin'in e-posta linkinde kullandığı opaque invitation ID bu sözleşmeyi doğrudan karşılamaz.
  - Alternatif: Better Auth organization plugin'ine tüm organization modelini devretmek.
  - Sonuç: Auth tabloları kütüphane uyumlu, B2B organization kuralları açık domain sınırındadır.
- Karar: Better Auth verification identifier'ları `hashed`, session'lar DB-backed ve cookie cache kapalı olacaktır.
  - Gerekçe: Reset/email tokenlarının düz saklanmaması ve session revoke işleminin anında etkili olması gerekir.
  - Alternatif: Kısa cookie cache veya stateless session.
  - Sonuç: Hassas aksiyonlar her istekte gerçek session kaydını doğrular.
- Karar: Private belgeler S3 uyumlu private bucket'a yazılır ve yalnız yetkili server route üzerinden stream edilir.
  - Gerekçe: Public object URL ve IDOR riskini kaldırır; her indirmede org/admin sahiplik kontrolü uygulanır.
  - Alternatif: Süreli signed URL.
  - Sonuç: Faz 1'de URL üretimi yerine güvenli uygulama proxy'si; sonraki storage adapterları aynı portu kullanabilir.
- Karar: Auth ve hassas endpoint rate limit anahtarları SHA-256 ile normalize edilip PostgreSQL'de saklanır.
  - Gerekçe: Redis eklemeden çok-process uyumlu limit ve ham IP/e-posta minimizasyonu sağlar.
  - Alternatif: In-memory limit veya Redis.
  - Sonuç: Modüler monolit/Docker kapsamı korunur.

### Doğrulanan resmî kaynaklar (20 Temmuz 2026)

- Better Auth npm kararlı sürüm: https://www.npmjs.com/package/better-auth
- Next.js entegrasyonu: https://better-auth.com/docs/integrations/next
- Prisma adapter: https://better-auth.com/docs/adapters/prisma
- Email/password ve email akışları: https://better-auth.com/docs/authentication/email-password ve https://better-auth.com/docs/concepts/email
- Session/cookie/security: https://better-auth.com/docs/concepts/session-management, https://better-auth.com/docs/concepts/cookies ve https://better-auth.com/docs/reference/security
- Rate limit: https://better-auth.com/docs/concepts/rate-limit
- Verification identifier hashing: https://better-auth.com/docs/reference/options#verification

## Güvenlik ve veri etkisi

- E-posta, telefon, vergi kimliği, KEP, adres ve şirket belgeleri PII/özel veri olarak ele alınır; application loglara yazılmaz.
- Tax number normalize hash ile uniqueness/lookup alır; gösterim değeri uygulama anahtarıyla authenticated encryption altında saklanır.
- Parola Better Auth scrypt ile hashlenir; reset/email verification ve invitation tokenları düz saklanmaz.
- Cookie httpOnly, SameSite=Lax, host-only; production HTTPS'te Secure. Origin/CSRF kontrolleri devre dışı bırakılmaz.
- Organization erişimi tek sorguda `organizationId` + üyelik/rol filtresiyle sınırlandırılır; başka org için 404 tercih edilir.
- Audit log append-only servis üzerinden oluşturulur; normal kullanıcı update/delete endpoint'i yoktur ve before/after payload redacted olur.
- Belge MIME/magic byte/boyut/checksum doğrulanır, SVG/HTML/zip reddedilir ve public bucket kullanılmaz.
- Faz 1 migration'ı yeni tablolar ekler; Faz 0 `SystemSetting` verisini değiştirmez veya silmez.

## Uygulama adımları

- [x] Bağlayıcı dosyaları ve ilgili şartname bölümlerini tamamen oku.
- [x] Faz 0 checkpoint'ini ve başlangıç kalite durumunu doğrula.
- [x] Better Auth güncel sürüm/API/güvenlik davranışını resmî dokümanlardan doğrula.
- [x] Faz 1 dependency, environment sözleşmesi ve Prisma modelleri için forward migration oluştur.
- [x] Better Auth, email adapter, hash/rate-limit ve güvenli session çekirdeğini kur.
- [x] Organization repository/service, central RBAC ve invitation akışını kur.
- [x] Verification state machine, audit log ve private document storage akışını kur.
- [x] Auth, onboarding, session, organization ve admin route/UI akışlarını tamamla.
- [x] Development demo seed hesapları ve private bucket hazırlığını idempotent yap.
- [x] Unit ve gerçek PostgreSQL security/integration testlerini tamamla.
- [x] Supplier/reseller/admin Playwright E2E akışlarını masaüstü ve 360 px mobilde doğrula.
- [x] Tüm kalite kapıları ve Docker image build'i çalıştırıp hataları düzelt.
- [x] README, OpenAPI, data processing inventory, PROJECT_STATUS ve bu planı sonuçlarla güncelle.
- [x] Faz 1 sonunda dur; Faz 2'ye geçme.

## Dosya değişiklikleri

- Paket/config: `package.json`, `pnpm-lock.yaml`, `.env.example`, Docker/CI gerektiği kadar.
- Veri: `prisma/schema.prisma`, yeni `prisma/migrations/**`, `prisma/seed.ts`.
- Auth/security: `src/lib/auth/**`, `src/lib/security/**`, `src/lib/email/**`, `src/lib/storage/**`.
- Domain: `src/modules/auth/**`, `src/modules/organizations/**`, `src/modules/verification/**`, `src/modules/audit/**`.
- UI/API: `src/app/(auth)/**`, `src/app/onboarding/**`, `src/app/panel/**`, `src/app/admin/**`, `src/app/api/**`.
- Test: `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`.
- Belge: `README.md`, `docs/openapi.json`, `docs/data-processing-inventory.md`, `PROJECT_STATUS.md`, `.agent/execplan.md`.

## Migration ve geri dönüş

- Faz 0 migration dosyaları değiştirilmeyecek; yeni Faz 1 forward migration auth, organization, verification, audit ve rate-limit tablolarını/indekslerini ekleyecek.
- Hassas tax değeri için encrypted value + deterministic normalized hash tutulacak; seed yalnız development ortamında idempotent upsert çalıştıracak.
- Geri dönüş yeni Faz 1 tablolarını bağımlılık sırasıyla kaldırabilir; production veri varsa otomatik destructive rollback uygulanmayacak, export/retention kararı gerekir.
- Verification/audit/document kayıtları hard delete API'sine sahip olmayacak.

## Test planı

- Birim: permission matrix, verification state machine, token hashing, PII redaction, file validation, rate limit kararları.
- Entegrasyon: Better Auth registration/session/reset hash, org isolation read/write, membership role bypass, admin queue, document ownership/private erişim, audit üretimi ve migration indeksleri.
- E2E: supplier ve reseller kayıt-email verification-onboarding-submit; admin login/queue/approve-needs changes-reject; session list/revoke; responsive/keyboard/form errors.
- Güvenlik: URL/ID değiştirerek org/belge BOLA, admin endpoint BFLA, plaintext token DB taraması, failed-login ve sensitive endpoint rate limit, public storage erişim reddi, secret/PII log testi.
- Manuel: Mailpit verification/reset/invitation mesajları, MinIO private bucket/object ve admin/user UI.

## Kabul kriterleri

- [x] Tedarikçi ve alıcı kayıt/onboarding E2E geçer.
- [x] Admin başvuruyu onaylar, değişiklik ister ve reddeder.
- [x] Org A, Org B verisini okuyamaz veya değiştiremez.
- [x] Üyelik rolleri server-side uygulanır; yetkisiz admin/org işlemleri reddedilir.
- [x] Private belgeler public URL ile açılamaz; ID değişimi erişim sağlamaz.
- [x] Reset, email verification ve invitation tokenları düz metin saklanmaz.
- [x] Başarısız giriş ve hassas endpointlerde rate limit vardır.
- [x] Kritik rol, verification ve document işlemleri redacted audit log üretir.
- [x] Secret/PII application loglara sızmaz.
- [x] Migration, seed, unit, integration ve E2E testleri geçer.
- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, `docker compose build app` başarılıdır.
- [x] PROJECT_STATUS ve yaşayan plan gerçek sonuçlarla günceldir.
- [x] Faz 2'ye geçilmeden durulur.

## İlerleme günlüğü

- 2026-07-20 14:35 +03:00:
  - Yapılan: Faz 1 bağlayıcı belgeleri ve ilgili ürün şartnamesi bölümleri tamamen okundu. Faz 0 checkpoint/temiz ağaç ve kalite tabanı doğrulandı. Better Auth güncel resmi API/güvenlik davranışı araştırıldı ve Faz 1 mimari kararları donduruldu.
  - Kanıt: `d509db9`; format/lint/typecheck başarılı; unit 9/9, integration 3/3, E2E 6/6, `pnpm build` başarılı; Compose servisleri healthy. Docker build yalnız registry DNS çözümünde durdu.
  - Sonraki: Dependency ve yeni forward migration ile auth/organization çekirdeğini kurmak.
- 2026-07-20 16:52 +03:00:
  - Yapılan: Faz 1 auth, organization, onboarding, private belge, doğrulama kuyruğu, state machine, RBAC, rate limit, immutable audit, Mailpit ve güvenli demo seed kapsamı tamamlandı. Bağımsız güvenlik turunda son owner rol yarışı ve paralel doğrulama geçişleri organization advisory lock/optimistic state claim ile kapatıldı.
  - Kanıt: format/lint/typecheck başarılı; unit 17/17; gerçek PostgreSQL/MinIO integration 10/10; temiz sunucuda Edge tabanlı desktop+360 px Playwright 10/10; production build başarılı; `docker compose build app` başarılı. PostgreSQL, MinIO ve Mailpit healthy; `8025`, `9001` ve MinIO health `200`.
  - Sonraki: Faz 1 sonunda dur. Faz 2 yalnız yeni kullanıcı talimatıyla başlayabilir.

## Sürprizler ve öğrenilenler

- Docker Desktop mevcut image'ları çalıştırabildiği hâlde başlangıç image rebuild sırasında `registry-1.docker.io` DNS çözümleyemedi. Kod/build sorunu değil; final kapıda yeniden denenecek.
- Better Auth organization plugin davet akışında opaque invitation ID kullanıyor. Bu fazın “token düz saklanmaz” şartı için invitation domain'i özel hashli token modeliyle uygulanacak.
- Native Chromium indirmesi yerel ağda tamamlanmadı; Playwright matrisi makinede kurulu Edge kanalıyla aynı Chromium motorunda çalıştırıldı ve CI resmi Chromium kurulumunu kullanacak şekilde bırakıldı.
- Eski geliştirme sunucusu E2E başlangıcında 3000 portunu tutabiliyordu; test yapılandırması varsayılan olarak stale server reuse etmez ve global setup yalnız geçici rate-limit kayıtlarını temizler.

## Sonuç

Faz 1 kapsamı tamamlandı. Kimlik ve session akışları, işletme/adres/üyelik modeli, deny-by-default server-side RBAC, private belge, şirket doğrulama state machine'i, immutable/redacted audit ve development e-posta/seed akışları gerçek servislerle doğrulandı. Tüm zorunlu kalite kapıları geçti ve Faz 2'ye geçilmedi.

---

# Arşiv — Faz 00 Foundation

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
