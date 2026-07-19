# AGENTS.md — TedarikKöprü çalışma kuralları

## Başlangıç

- Her işte önce `START_HERE_CODEX.md`, `DECISIONS.md` ve aktif `tasks/PHASE_XX_*.md` dosyasını oku.
- Ayrıntılı ürün kaynağı `docs/PRODUCT_AND_TECH_SPEC.md` dosyasıdır.
- Bütün ürünü tek çalışmada yapma. Yalnız aktif fazı uygula.
- Karmaşık işlerde `.agent/PLANS.md` biçiminde `.agent/execplan.md` kullan ve gerçek ilerlemeye göre güncelle.

## Çalışma anlaşması

- Önce mevcut repoyu ve kullanıcı değişikliklerini incele.
- Kullanıcının mevcut çalışmasını silme, resetleme veya üzerine yazma.
- Büyük değişikliklerden önce Git checkpoint oluştur.
- Belirsizlikte `DECISIONS.md` varsayımlarını kullan; gereksiz soru sorma.
- Kapsam dışı işi kodlama; sonraki işler listesine yaz.
- Çalışmayan kodu tamamlanmış sayma.
- Kimlik bilgisi yoksa mock/sandbox adaptörü oluştur ve canlı özelliği kapalı bırak.
- Değişmiş olabilecek framework/API ayrıntıları için resmi birincil dokümantasyonu doğrula.

## Mimari

- Modüler monolit.
- Domain kuralları UI, route handler veya rastgele ORM çağrıları içinde dağılmamalı.
- Auth, organizations, catalog, pricing, inventory, checkout, orders, payments, shipping, returns, messaging, integrations ve admin sınırları açık olmalı.
- Harici servisler adaptör arkasında olmalı.
- Server Components varsayılandır; Client Components yalnız etkileşim gerektiğinde.
- Finans, stok ve sipariş durum geçişleri merkezi servis/state machine üzerinden yürütülür.
- Gereksiz mikroservis, Redis, Kubernetes, GraphQL veya event sourcing ekleme.

## Veri

- PostgreSQL ana veri kaynağıdır.
- Para integer minor unit olarak saklanır; floating point kullanılmaz.
- Tarihler DB'de UTC, UI'da `Europe/Istanbul`.
- Sipariş satırı snapshot'ları immutable.
- Finans, audit, sipariş ve stok hareketleri hard delete edilmez.
- Tüm organization-scoped sorgular org filtresi içerir.
- Kritik stok/ödeme işlemlerinde transaction, idempotency ve concurrency kontrolü zorunlu.
- Migration geçmişini değiştirme; yeni migration oluştur.
- Liste endpointlerinde cursor pagination tercih et.

## Güvenlik

- Yetkilendirme server-side ve deny-by-default.
- Başka organizasyonun kaynağına ID değiştirerek erişim test edilmelidir.
- Secret, token, parola, kart verisi, belge, VKN, IBAN ve tam adres loglanmaz.
- Cookie güvenliği, CSRF, rate limit, session rotation ve güvenli parola sıfırlama uygula.
- Webhooklarda raw body, imza doğrulama, replay koruması ve dedup zorunlu.
- Dosyalar private storage; MIME/magic byte/boyut/checksum kontrolü.
- CSV import/export formula-injection güvenli olmalı.
- Kullanıcı redirect'i ödeme başarı kaynağı değildir.
- Canlı ödeme ve entegrasyon feature flag'leri varsayılan kapalıdır.

## UI ve içerik

- Kullanıcı metinleri doğal Türkçe.
- Responsive, klavye erişilebilir ve WCAG 2.2 AA hedefli.
- Finans ve stok işlemlerinde doğrulanmadan optimistic success gösterme.
- Ham stack trace veya provider cevabı kullanıcıya gösterme.
- Tarih ve para gösterimi `tr-TR`.
- Loading, empty, success ve error durumlarını tasarla.

## Test ve kalite

Değişikliğe uygun testleri yaz. Faz tamamlanmadan önce mümkün olanların tümünü çalıştır:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

- Bir komut çalışmadıysa sebebi ve gereken ön koşulu raporla.
- Testi geçsin diye testi anlamsızlaştırma veya kritik kontrolü kapatma.
- BOLA/IDOR, rol bypass, stok yarış koşulu, ödeme tekrarları ve webhook tekrarları test edilmelidir.
- Her faz sonunda değişiklikleri incele ve yüksek riskli bulguları düzelt.

## Dokümantasyon ve sonuç

- `README.md`, ilgili `docs/` dosyaları, `.env.example`, migration ve seed kodla beraber güncellenir.
- `PROJECT_STATUS.md` gerçek durumu göstermelidir.
- Son rapor: yapılanlar, test kanıtı, bilinen eksikler, değişen dosyalar ve bir sonraki önerilen faz.
