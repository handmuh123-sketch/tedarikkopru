# ÜRÜN VE TEKNİK ŞARTNAME — Türkiye Odaklı B2B Tedarikçi Pazaryeri

> **Çalışma adı:** TedarikKöprü  
> **Belge sürümü:** 2.0  
> **Araştırma/güncelleme tarihi:** 20 Temmuz 2026  
> **Hedef:** Türkiye'deki doğrulanmış toptancı/üretici/tedarikçiler ile Trendyol, Hepsiburada, Amazon Türkiye, n11, kendi e-ticaret sitesi ve benzeri kanallarda satış yapan işletmeleri buluşturan, sipariş–ödeme–kargo–stok–teklif süreçlerini yöneten üretime yakın bir B2B pazaryeri MVP'si geliştirmek.  
> **Ana uygulama dili:** Türkçe  
> **Para birimi:** TRY  
> **Zaman dilimi:** Europe/Istanbul  
> **Hukuki not:** Bu belge yazılım ve ürün tasarım rehberidir; hukuk, mali müşavirlik veya ödeme hizmetleri lisansı danışmanlığı değildir. Canlıya geçmeden önce Türkiye'de e-ticaret, KVKK, vergi ve ödeme hizmetleri alanında çalışan uzmanlarca inceleme yapılmalıdır.

---

## 0. BU BELGE NASIL KULLANILIR

Bu belge ürünün ayrıntılı başvuru kaynağıdır. Codex bu belgenin tamamını tek çalışmada uygulamaya çalışmamalıdır.

Bağlayıcı çalışma sırası:

1. Kök dizindeki `AGENTS.md` dosyasını uygula.
2. `START_HERE_CODEX.md` dosyasını oku.
3. Sadece kullanıcı tarafından seçilen `tasks/PHASE_XX_*.md` görevini uygula.
4. Bu şartnamenin yalnız ilgili bölümlerini ayrıntılı bağlam olarak kullan.
5. `.agent/execplan.md` dosyasını yaşayan plan olarak güncelle.
6. Fazın kabul kriterleri geçince dur ve kullanıcıya rapor ver.
7. Açıkça talep edilmedikçe bir sonraki faza geçme.

## 0.1 SÜRÜM STRATEJİSİ

### Pilot MVP — önce yapılacak

Pilot sürümün amacı gerçek toptancı ve pazaryeri satıcılarıyla talebi doğrulamaktır. Şunlar çalışmalıdır:

- işletme kaydı ve yönetici onayı,
- tedarikçi profili,
- ürün/varyant/fiyat/stok,
- ürün arama ve favoriler,
- teklif talebi,
- tek tedarikçili sepet,
- manuel ödeme veya mock ödeme kaydı,
- sipariş kabul/hazırlama,
- manuel kargo takip numarası,
- mesajlaşma,
- temel admin paneli,
- audit ve güvenlik temeli.

### Ticari MVP — pilot doğrulandıktan sonra

- canlı pazaryeri ödeme sağlayıcısı,
- otomatik komisyon bölüştürme,
- gerçek kargo adaptörü,
- gelişmiş iade/refund,
- pazaryeri ürün/sipariş entegrasyonları,
- dropshipping,
- e-belge entegrasyonu.

`FEATURE_LIVE_PAYMENTS`, `FEATURE_DROPSHIPPING` ve harici entegrasyonlar varsayılan kapalı kalır.

## 0.2 CODEX'E GENEL GÖREV

Sen bu projenin kıdemli ürün mühendisi, yazılım mimarı, güvenlik mühendisi, test mühendisi ve teknik dokümantasyon yazarı olarak çalışacaksın.

Bu şartnameyi ürün kaynağı olarak kullan. Ancak yalnız aktif faz görev dosyasının kapsamını uygula; bütün ürünü tek seferde üretme.

### Çalışma davranışın

1. Önce depoyu incele. Boşsa uygun başlangıç yapısını kur.
2. `.agent/PLANS.md` formatında yaşayan bir ExecPlan oluştur: `.agent/execplan.md`.
3. Planı gerçek ilerlemeye göre güncel tut.
4. Gereksiz soru sorma. Belirsizliklerde bu belgede verilen varsayımları kullan.
5. Her fazda:
   - uygulamayı geliştir,
   - veritabanı geçişlerini oluştur,
   - seed verisini güncelle,
   - testleri yaz,
   - `lint`, `typecheck`, birim testleri, entegrasyon testleri ve üretim derlemesini çalıştır,
   - sonuçları `.agent/execplan.md` dosyasına kaydet.
6. Kod çalışmıyorsa veya test geçmiyorsa üstünü örtme; kök nedeni bul ve düzelt.
7. Sahte “tamamlandı” mesajları verme. Bitmiş sayılabilmesi için kabul kriterleri doğrulanmalıdır.
8. API anahtarları veya canlı servis erişimi yoksa:
   - tam çalışan mock/sandbox sağlayıcısı oluştur,
   - gerçek sağlayıcı adaptörünü arayüz ve veri eşlemesiyle hazırla,
   - canlı entegrasyonu güvenli biçimde kapalı tut,
   - eksik ticari kimlik bilgilerini dokümante et.
9. Mevzuat veya üçüncü taraf API ayrıntısı değişmiş olabilecekse resmi dokümantasyonu canlı olarak kontrol et. Özellikle Trendyol Product V1 kullanma; güncel Product V2 ve güncel sipariş/webhook dokümanlarını esas al.
10. Büyük değişikliklerden önce ve sonra Git checkpoint oluştur. Kullanıcının mevcut çalışmasını silme.
11. Uygulamanın sonunda:
    - `README.md`,
    - `docs/architecture.md`,
    - `docs/domain-model.md`,
    - `docs/security.md`,
    - `docs/legal-readiness.md`,
    - `docs/integrations.md`,
    - `docs/deployment.md`,
    - `docs/operator-runbook.md`,
    - örnek `.env.example`,
    - Docker geliştirme ortamı,
    - API sözleşmesi/OpenAPI çıktısı,
    - test raporu
    üret.

---

# 1. ÜRÜN VİZYONU

TedarikKöprü, yalnızca ürün ilanı bulunan bir dizin olmayacaktır. İşletmeler arası güveni ve operasyonu yöneten bir platform olacaktır.

Platform şu temel problemi çözer:

- Pazaryeri satıcıları güvenilir tedarikçiyi, gerçek stok durumunu, toptan fiyatı, minimum sipariş miktarını ve gönderim şartlarını tek yerde göremez.
- Toptancılar yeni dijital satış kanallarına ulaşmakta, ürün verisini standartlaştırmakta, siparişleri takip etmekte ve farklı satıcılarla operasyon yürütmekte zorlanır.
- Stok ve fiyat değişiklikleri, iptaller, yanlış ürün verileri, kargo gecikmeleri ve iade anlaşmazlıkları iki tarafın da zarar etmesine yol açar.
- Dropshipping yapılırsa son müşteri verisinin paylaşımı, paketleme, fatura, marka görünürlüğü, iade adresi ve hizmet seviyesi kuralları net değildir.

Platformun ana vaadi:

> “Doğrulanmış tedarikçileri e-ticaret satıcılarıyla buluşturan; ürün keşfi, teklif, toptan sipariş, güvenli ödeme dağıtımı, stok rezervasyonu, kargo ve uyuşmazlık süreçlerini tek panelde yöneten Türkiye odaklı B2B ticaret altyapısı.”

---

# 2. STRATEJİK ÜRÜN KARARLARI

Aşağıdaki kararları varsayılan ve bağlayıcı kabul et.

## 2.1 İlk sürüm web uygulamasıdır

- Önce responsive web uygulaması geliştir.
- Native iOS/Android uygulaması MVP kapsamı dışındadır.
- Arayüz 360 px genişlikten masaüstüne kadar kullanılabilir olmalıdır.
- PWA temel manifesti eklenebilir; ancak offline sipariş gibi karmaşık özellikler yapılmayacaktır.

## 2.2 MVP yalnızca doğrulanmış işletmeler içindir

- Tedarikçi ve alıcı tarafında şirket/esnaf doğrulama akışı bulunur.
- Ziyaretçiler genel ürün kataloğunu görebilir; toptan fiyat ve iletişim gibi hassas alanlar doğrulanmış giriş gerektirebilir.
- Bireysel tüketici hesabı MVP kapsamında değildir.
- Platformun kendisi ürün satıcısı değildir; siparişin satıcısı tedarikçi işletmedir.
- Platform, elektronik ticaret aracı hizmet sağlayıcı rolüne hazırlanır.

## 2.3 İlk operasyon modeli: “Tedarikçi, satıcı işletmeye gönderir”

MVP'nin ana lojistik modeli:

1. Alıcı işletme platformdan toptan sipariş verir.
2. Tedarikçi siparişi kabul eder.
3. Tedarikçi paketi hazırlar.
4. Tedarikçi kargo takip numarasını sisteme girer veya kargo adaptörüyle etiket üretir.
5. Ürün alıcı işletmenin adresine gider.

Bu model en düşük operasyon ve mevzuat karmaşıklığına sahiptir.

## 2.4 Dropshipping kontrollü ve özellik bayraklıdır

Dropshipping, MVP'nin zorunlu ana akışı değildir. Altyapısı hazırlanır ama `FEATURE_DROPSHIPPING=false` varsayılanıyla kapalı gelir.

Açıldığında:

- Alıcı işletme, son müşterisinin teslimat bilgilerini siparişe ekleyebilir.
- Tedarikçi paketi son müşteriye yollar.
- Nihai tüketici karşısındaki satıcı/merchant of record alıcı işletmedir.
- Paket üzerinde tedarikçi markası görünmemesi, nötr paketleme, irsaliye/fatura sorumluluğu, iade adresi ve SLA sözleşmeyle tanımlanır.
- Son müşteri PII verileri yalnızca siparişin ifası için, süre ve amaç sınırlı olarak paylaşılır.
- Tedarikçi bu verileri pazarlama için kullanamaz.
- Dropshipping siparişleri ayrı açık rıza değil, uygun hukuki işleme şartı ve veri işleme sözleşmesi değerlendirmesi gerektirir; canlıya geçmeden hukuk incelemesi zorunludur.

## 2.5 Depo/fulfillment modeli sonraki fazdır

Platformun kendi deposundan ürün göndermesi, stok kabul, raf, toplama, paketleme, desi, kayıp/hasar ve depo ücretlendirmesi gerektirir. Veri modeli buna genişleyebilir; fakat MVP'de gerçek WMS yapılmayacaktır.

## 2.6 Ödeme platform hesabında “emanet” tutulmaz

- Platform kendi banka hesabında satıcı parası biriktirip manuel dağıtmayacaktır.
- TCMB tarafından yetkilendirilmiş bir ödeme/elektronik para kuruluşunun pazaryeri/alt üye işyeri çözümü kullanılacaktır.
- Sağlayıcı adaptörü tahsilat, alt satıcı kaydı, komisyon ayrıştırma, iade ve ödeme aktarımı akışlarını kapsar.
- MVP geliştirmede `MockMarketplacePaymentProvider` tam çalışır.
- Gerçek sağlayıcı olarak öncelik sırası:
  1. iyzico Marketplace,
  2. PayTR Pazaryeri Çözümü.
- Canlı sağlayıcı seçimi ticari teklif, sözleşme, komisyon, vade, KYC gereksinimleri ve teknik değerlendirmeden sonra yapılır.
- Kart numarası, CVV veya tam kart verisi uygulama sunucusuna alınmaz ve veritabanında tutulmaz.

## 2.7 MVP'de tek tedarikçili checkout

Veri modeli bir checkout altında birden fazla tedarikçi siparişini destekleyebilecek biçimde kurulabilir; fakat ilk çalışan sürümde sepet tek tedarikçiye ait ürünlerden oluşur.

Nedenleri:

- kargo ücreti,
- teslimat SLA'sı,
- kısmi iptal,
- çoklu ödeme dağıtımı,
- iade,
- fatura,
- stok rezervasyonu

karmaşıklığını azaltmak.

Başka tedarikçiden ürün eklenirse kullanıcıya mevcut sepeti temizleme veya ayrı listeye kaydetme seçeneği sun.

## 2.8 Entegrasyon önceliği

MVP:

- CSV/XLSX ürün içe aktarma,
- CSV/XLSX ürün dışa aktarma,
- manuel kargo takip numarası,
- mock ödeme,
- gerçek ödeme adaptörüne hazır altyapı.

Sonraki faz:

- Trendyol,
- Hepsiburada,
- Amazon Türkiye SP-API,
- n11,
- kargo şirketleri,
- e-Fatura/e-Arşiv özel entegratörü,
- ERP/muhasebe sistemleri.

Harici platformları ekran kazıma/scraping ile yönetme. Yalnızca resmi API, webhook, dosya aktarımı veya açıkça izin verilen entegrasyon yöntemlerini kullan.

---

# 3. HEDEF KULLANICILAR VE ROLLER

## 3.1 Platform rolleri

### PLATFORM_SUPER_ADMIN

- tüm sisteme erişir,
- özellik bayraklarını yönetir,
- komisyon kurallarını belirler,
- yönetici atar,
- güvenlik ve denetim kayıtlarını görür.

### PLATFORM_ADMIN

- şirket doğrulamalarını inceler,
- ürünleri moderasyondan geçirir,
- kategori/marka yönetir,
- sipariş, iade ve uyuşmazlıkları yönetir,
- entegrasyon hatalarını görür.

### PLATFORM_OPERATIONS

- sipariş ve kargo operasyonunu takip eder,
- kullanıcılarla dahili iletişim kurar,
- tedarikçi SLA ihlallerini işaretler.

### PLATFORM_SUPPORT

- destek taleplerini ve konuşmaları görür,
- finansal veya gizli alanlara sınırlı erişir.

### PLATFORM_FINANCE

- komisyon, ödeme, iade, payout ve mutabakat ekranlarına erişir,
- ürün düzenleyemez.

## 3.2 İşletme türleri

- `SUPPLIER`: toptancı, üretici, distribütör veya tedarikçi.
- `RESELLER`: pazaryeri/e-ticaret satıcısı.
- `BOTH`: hem tedarikçi hem alıcı olabilen işletme.

## 3.3 İşletme üyelik rolleri

- `OWNER`
- `ORG_ADMIN`
- `CATALOG_MANAGER`
- `ORDER_MANAGER`
- `FINANCE`
- `WAREHOUSE_OPERATOR`
- `VIEWER`

Yetkilendirme yalnızca kullanıcı rolüne göre değil, ilgili işletme üyeliğine ve kaynak sahipliğine göre yapılmalıdır.

Örnek:

- Bir tedarikçi çalışanı sadece kendi işletmesinin ürünlerini düzenleyebilir.
- Bir alıcı çalışanı sadece kendi işletmesinin siparişlerini görebilir.
- Platform destek çalışanı kart/ödeme sağlayıcısının hassas tokenlarını göremez.
- Bir org üyesi başka org kimliğini URL'de değiştirerek veri erişememelidir.

---

# 4. MVP KAPSAMI

## 4.1 Kimlik doğrulama

- e-posta ve parola ile kayıt,
- e-posta doğrulama,
- giriş/çıkış,
- parola sıfırlama,
- güvenli cookie tabanlı oturum,
- oturumları görüntüleme ve sonlandırma,
- başarısız giriş denemelerinde oran sınırlama,
- yönetici hesapları için 2FA hazırlığı; mümkünse ilk sürümde 2FA,
- kullanıcı profil ayarları,
- hesap kapatma talebi.

## 4.2 İşletme oluşturma ve doğrulama

Kayıtta kullanıcı işletme türünü seçer.

Toplanacak alanlar:

- ticaret unvanı,
- işletme/marka adı,
- işletme türü,
- vergi kimlik numarası,
- vergi dairesi,
- MERSİS numarası, uygulanıyorsa,
- KEP adresi,
- merkez adresi,
- yetkili kişi,
- doğrulanmış telefon,
- web sitesi,
- sektör/kategori,
- fatura adresi,
- depo/çıkış adresleri,
- banka/ödeme sağlayıcısı alt üye işyeri bilgileri,
- sözleşme kabul kayıtları.

Belgeler:

- vergi levhası,
- imza sirküleri veya yetki belgesi,
- ticaret sicil gazetesi veya esnaf kayıt belgesi,
- banka hesap/IBAN doğrulama dokümanı gerekirse,
- marka yetki belgesi gerekirse.

Belge dosyaları:

- private object storage alanında tutulur,
- imzalı, süreli erişim URL'siyle açılır,
- uzantı/MIME/boyut kontrolü yapılır,
- kötü amaçlı dosya taraması için adaptör oluşturulur,
- herkese açık URL verilmez.

Doğrulama durumları:

- `DRAFT`
- `SUBMITTED`
- `IN_REVIEW`
- `NEEDS_CHANGES`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`

Her durum değişikliği audit log ve bildirim üretir.

## 4.3 Tedarikçi profili

- logo,
- kapak görseli,
- şirket açıklaması,
- kuruluş yılı,
- şehir,
- ürün kategorileri,
- ortalama hazırlık süresi,
- minimum genel sipariş tutarı,
- desteklenen fulfillment modları,
- nötr paketleme desteği,
- iade adresi,
- sertifikalar,
- doğrulama rozeti,
- performans metrikleri,
- çalışma günleri,
- tatil/kapalı gün takvimi.

İlk sürümde kullanıcı yorumu ve yıldız puanı yerine doğrulanabilir operasyon metriklerini öne çıkar:

- zamanında kabul oranı,
- zamanında kargolama oranı,
- iptal oranı,
- uyuşmazlık oranı.

Manipüle edilebilir, kanıtsız puanlar kullanma.

## 4.4 Katalog ve ürün yönetimi

Ürün yapısı:

- ürün ana kaydı,
- varyantlar,
- SKU,
- barkod/GTIN,
- marka,
- kategori,
- başlık,
- kısa açıklama,
- uzun açıklama,
- teknik özellikler,
- görseller,
- paket içeriği,
- ağırlık/desi,
- KDV oranı,
- menşei,
- garanti bilgisi,
- tehlikeli madde işareti,
- satışı kısıtlı ürün işareti,
- hazırlık süresi,
- minimum sipariş miktarı,
- sipariş artış adımı,
- fiyat kademeleri,
- mevcut stok,
- güvenlik stoğu,
- stok güncelleme zamanı,
- fulfillment seçenekleri,
- dropshipping uygunluğu.

Ürün durumları:

- `DRAFT`
- `PENDING_REVIEW`
- `ACTIVE`
- `PAUSED`
- `REJECTED`
- `ARCHIVED`

Kurallar:

- yalnızca onaylı tedarikçi ürün yayınlayabilir,
- fiyat kuruş cinsinden integer saklanır,
- ürün varyantı olmadan stok tutulmaz,
- SKU tedarikçi işletme içinde benzersizdir,
- negatif stok yasaktır,
- aktif siparişe ait ürün verileri değişse bile sipariş satırındaki snapshot değişmez,
- kategori özellikleri JSON Schema benzeri tanımla doğrulanabilir,
- görsel sırası ve ana görsel alanı vardır,
- bulk edit ve CSV/XLSX içe aktarma bulunur,
- içe aktarma önce önizleme ve hata raporu üretir,
- tek işlemde hatalı satırlar yüzünden tüm dosya körlemesine kaydedilmez,
- idempotent import job tasarla.

## 4.5 Fiyatlandırma

Her varyant için:

- liste toptan fiyatı,
- indirimli fiyat,
- KDV dahil/hariç gösterim ayarı,
- kademeli fiyatlar,
- geçerlilik başlangıç/bitiş tarihi,
- alıcı grubuna özel fiyat gelecekte desteklenebilir.

Örnek kademe:

- 1–9 adet: 120,00 TL
- 10–49 adet: 110,00 TL
- 50+ adet: 98,00 TL

Checkout anında fiyat snapshot'ı alınır. Sonradan ürün fiyatı değişirse mevcut sipariş etkilenmez.

## 4.6 Arama ve keşif

- ürün araması,
- tedarikçi araması,
- kategori ağacı,
- marka,
- şehir,
- minimum sipariş,
- fiyat aralığı,
- stokta olanlar,
- dropshipping uygunluğu,
- hazırlık süresi,
- doğrulanmış tedarikçi,
- sıralama: alaka, fiyat, en yeni, hazırlık süresi.

MVP'de PostgreSQL full-text search ve trigram indeksleri kullan. Ayrı Elasticsearch/Meilisearch kurma.

Arama sonuçlarında reklamlı/öne çıkarılmış ürün olacaksa açıkça “Sponsorlu” olarak etiketle ve organik sıralama mantığını karıştırma.

## 4.7 Favoriler ve listeler

- ürün favorileme,
- tedarikçi favorileme,
- “Sonra al” listesi,
- alım listesi oluşturma,
- stok/fiyat değişikliği bildirim tercihi.

## 4.8 Teklif talebi (RFQ)

Alıcı:

- kategori veya ürün için teklif talebi açabilir,
- hedef adet,
- hedef fiyat,
- teslimat şehri,
- gereken tarih,
- not ve dosya ekleyebilir,
- seçili tedarikçilere veya uygun tedarikçilere gönderebilir.

Tedarikçi:

- fiyat,
- minimum adet,
- geçerlilik süresi,
- hazırlık süresi,
- kargo şartı,
- not ile teklif verir.

Durumlar:

- `DRAFT`
- `OPEN`
- `QUOTED`
- `ACCEPTED`
- `REJECTED`
- `EXPIRED`
- `CANCELLED`

Kabul edilen teklif sepet/sipariş taslağına dönüştürülebilir.

## 4.9 Sepet ve checkout

Kurallar:

- tek tedarikçili sepet,
- ürün MOQ ve quantity step doğrulaması,
- stok kontrolü,
- fiyat kademesi hesaplama,
- minimum tedarikçi sipariş tutarı,
- teslimat adresi,
- fatura adresi,
- fulfillment modu,
- kargo yöntemi,
- kupon yerine MVP'de yönetici tanımlı promosyon altyapısı hazırlanabilir,
- sipariş notu,
- sözleşme/ön bilgilendirme ve işlem özeti erişimi,
- ödeme sağlayıcısı yönlendirmesi/iframe/checkout formu,
- idempotency key.

Checkout özetinde:

- ürünler,
- adet,
- birim fiyat,
- ara toplam,
- KDV,
- kargo,
- platform hizmet/komisyon gösterimi gerekiyorsa,
- genel toplam,
- teslimat tahmini,
- satıcı işletme,
- iade/iptal özeti

açıkça gösterilir.

## 4.10 Stok rezervasyonu

- Checkout başlatıldığında 15 dakikalık rezervasyon oluştur.
- Ödeme başarılı olursa rezervasyonu gerçek stok düşümüne dönüştür.
- Ödeme başarısız/iptal/zaman aşımı olursa rezervasyonu bırak.
- Aynı varyant için yarış koşullarını veritabanı transaction ve kilit/atomik update ile çöz.
- `available = on_hand - reserved - safety_stock`.
- İşlemler idempotent olmalıdır.
- Stok hareketleri immutable ledger olarak tutulmalıdır.

Stok hareket tipleri:

- `INITIAL`
- `MANUAL_ADJUSTMENT`
- `IMPORT`
- `RESERVATION`
- `RESERVATION_RELEASE`
- `SALE`
- `CANCELLATION_RESTORE`
- `RETURN_RESTORE`
- `DAMAGE`
- `CORRECTION`

## 4.11 Sipariş yaşam döngüsü

Ana durumlar:

- `PENDING_PAYMENT`
- `PAYMENT_PROCESSING`
- `PAID`
- `AWAITING_SUPPLIER_CONFIRMATION`
- `CONFIRMED`
- `PREPARING`
- `READY_TO_SHIP`
- `SHIPPED`
- `DELIVERED`
- `COMPLETED`
- `CANCEL_REQUESTED`
- `CANCELLED`
- `RETURN_REQUESTED`
- `PARTIALLY_RETURNED`
- `RETURNED`
- `DISPUTED`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

Geçişler merkezi state machine/service üzerinden yapılmalıdır. Controller veya UI doğrudan durum yazamaz.

Temel SLA:

- tedarikçi kabul süresi,
- hazırlama süresi,
- kargoya verme son zamanı,
- gecikme uyarısı,
- otomatik iptal davranışı özellik bayrağı.

Sipariş satırlarında snapshot sakla:

- ürün başlığı,
- SKU,
- varyant,
- görsel,
- KDV,
- fiyat,
- komisyon,
- tedarikçi adı,
- fulfillment şartları.

## 4.12 Tedarikçi sipariş paneli

- yeni siparişler,
- kabul/reddet,
- reddetme nedeni,
- hazırlık durumuna geçir,
- paket bilgileri,
- kargo etiketi veya manuel takip,
- faturayı yükle/entegrasyon çıktısı,
- toplu işlem,
- SLA uyarıları,
- sipariş konuşması.

Tedarikçi, ödeme başarılı olmadan müşteri adresini göremez.

Dropshipping kapalıysa son müşteri PII alanları hiç dönmemelidir.

## 4.13 Alıcı sipariş paneli

- sipariş listesi,
- durum filtresi,
- sipariş detayı,
- kargo takip,
- fatura indirme,
- iptal talebi,
- iade talebi,
- sorun bildir,
- tekrar sipariş,
- sipariş mesajları.

## 4.14 Kargo

MVP:

- `ManualShippingProvider`,
- kargo şirketi adı,
- takip numarası,
- takip URL şablonu,
- kargoya veriliş tarihi,
- teslim tarihi,
- paket sayısı,
- desi/ağırlık,
- gönderici ve teslimat adres snapshot'ı.

Adaptör arayüzü:

- gönderi oluştur,
- etiketi al,
- gönderiyi iptal et,
- durum sorgula,
- webhook işle,
- iade gönderisi oluştur.

Kargo durumları:

- `DRAFT`
- `LABEL_CREATED`
- `PICKUP_REQUESTED`
- `IN_TRANSIT`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `DELIVERY_FAILED`
- `RETURNING`
- `RETURNED`
- `CANCELLED`
- `LOST`
- `DAMAGED`

Gerçek taşıyıcı entegrasyonları için ticari sözleşme ve kimlik bilgisi gerekeceğinden sağlayıcı arayüzlerini ve mock'u tamamla; canlı adaptörleri özellik bayrağıyla kapalı tut.

## 4.15 Ödeme ve komisyon

Ödeme domain'i harici sağlayıcıdan bağımsız tasarlanmalıdır.

Ana varlıklar:

- PaymentIntent / Payment,
- PaymentTransaction,
- PaymentSplit,
- Refund,
- Payout,
- ProviderWebhookEvent,
- ReconciliationRecord.

Ödeme durumları:

- `CREATED`
- `REQUIRES_ACTION`
- `PROCESSING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

Komisyon:

- kategori,
- tedarikçi,
- kampanya veya global kurala göre tanımlanabilir,
- checkout sırasında hesaplanıp snapshot edilir,
- yüzde + sabit ücret altyapısı desteklenir,
- KDV ve ödeme kuruluşu komisyonu ayrı alanlardır,
- yuvarlama kuruş seviyesinde deterministik olmalıdır.

Sağlayıcı adaptörü:

```ts
interface MarketplacePaymentProvider {
  createOrUpdateSubmerchant(input: SubmerchantInput): Promise<SubmerchantResult>;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  retrievePayment(providerPaymentId: string): Promise<PaymentResult>;
  approveSettlement(input: SettlementApprovalInput): Promise<void>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(input: RawWebhookInput): Promise<VerifiedWebhookEvent>;
}
```

Kurallar:

- webhook imzası doğrulanmadan işlem yapma,
- webhook event ID benzersiz saklanmalı,
- tekrar gelen webhook güvenle yok sayılmalı,
- kullanıcı redirect sonucu ödeme başarısı için kaynak kabul edilmemeli,
- ödeme başarısı yalnızca doğrulanmış sağlayıcı cevabı/webhook ile kesinleşmeli,
- kart bilgisi loglanmamalı,
- sağlayıcı request/response'larında PII maskelemesi yapılmalı.

## 4.16 İptal, iade ve uyuşmazlık

İptal:

- ödeme öncesi serbest,
- ödeme sonrası tedarikçi hazırlamaya başlamadan talep,
- kargoya çıktıktan sonra iade sürecine yönlendirme,
- kısmi iptal altyapısı.

İade:

- neden,
- açıklama,
- fotoğraf/dosya,
- adet,
- iade adresi,
- kargo kodu,
- inceleme sonucu,
- stok geri alma kararı,
- tam/kısmi iade.

Uyuşmazlık:

- taraflar,
- sipariş/satır,
- kategori,
- açıklama,
- kanıt dosyaları,
- zaman çizelgesi,
- yönetici kararı,
- ödeme/iade aksiyonu,
- audit kaydı.

B2B ticaret için cayma koşullarını otomatik olarak tüketici mevzuatıyla eşitleme. B2B sözleşme ve tedarikçi iade politikası ayrı yönetilir. Dropshipping ile nihai tüketici akışında alıcı işletmenin tüketici yükümlülükleri ayrıca ele alınır.

## 4.17 Dahili mesajlaşma

- sipariş konuşması,
- teklif konuşması,
- destek konuşması,
- sistem mesajları,
- dosya eki,
- okunma durumu,
- kötüye kullanım raporu,
- platform moderasyonu.

İletişim, tarafların kişisel telefon/e-posta paylaşmasına zorlamayacak şekilde platform içinde yürütülmelidir.

## 4.18 Bildirimler

Kanallar:

- uygulama içi,
- e-posta,
- ileride SMS.

Olaylar:

- doğrulama durumu,
- teklif,
- yeni sipariş,
- tedarikçi kabul/ret,
- ödeme,
- kargo,
- teslimat,
- iptal/iade,
- uyuşmazlık,
- stok/fiyat değişimi,
- SLA gecikmesi.

Kullanıcı işlem bildirimlerini pazarlama izinlerinden ayır.

Pazarlama iletileri için:

- ayrı tercih,
- onay kaydı,
- kaynak/zaman/IP,
- ret kaydı,
- İYS entegrasyonuna hazır veri modeli.

## 4.19 Yönetici paneli

Ana modüller:

- genel dashboard,
- doğrulama kuyruğu,
- şirketler,
- kullanıcılar,
- ürün moderasyonu,
- kategori/marka,
- siparişler,
- kargolar,
- iadeler,
- uyuşmazlıklar,
- ödemeler,
- komisyonlar,
- payout/mutabakat,
- RFQ/teklifler,
- mesaj/raporlar,
- entegrasyonlar,
- import job'ları,
- webhook olayları,
- audit log,
- özellik bayrakları,
- yasal metin sürümleri,
- duyurular,
- sistem sağlığı.

Dashboard metrikleri:

- GMV,
- net gelir,
- sipariş sayısı,
- ortalama sipariş tutarı,
- aktif tedarikçi,
- aktif alıcı,
- dönüşüm,
- iptal oranı,
- zamanında kargolama,
- iade/uyuşmazlık oranı.

Metrik tanımlarını dokümante et. Aynı metriği farklı yerlerde farklı hesaplama.

---

# 5. MVP DIŞI

İlk sürümde yapma:

- native mobil uygulama,
- platformun kendi deposuna yönelik tam WMS,
- yapay zekâ ile otomatik ürün açıklaması üretme,
- çoklu para birimi,
- uluslararası vergi/gümrük,
- açık artırma,
- canlı yayın satış,
- kripto ödeme,
- tüketici cüzdanı,
- platformun lisanssız biçimde para tutması,
- tüm kargo şirketlerine gerçek bağlantı,
- tüm pazaryerlerine gerçek bağlantı,
- tam muhasebe/ERP,
- gelişmiş öneri motoru,
- mikroservis mimarisi,
- Kubernetes,
- gereksiz event sourcing.

Genişletme noktalarını oluştur; fakat çalışmayan büyük sistemler inşa etme.

---

# 6. BİLGİ MİMARİSİ VE EKRANLAR

## 6.1 Herkese açık sayfalar

- `/`
- `/urunler`
- `/urunler/[slug]`
- `/tedarikciler`
- `/tedarikciler/[slug]`
- `/kategoriler/[slug]`
- `/nasil-calisir`
- `/tedarikci-ol`
- `/satici-ol`
- `/hakkimizda`
- `/iletisim`
- `/yardim`
- `/yasal/kullanim-kosullari`
- `/yasal/gizlilik`
- `/yasal/cerez`
- `/yasal/aydinlatma`
- `/yasal/aracilik-sozlesmesi`
- `/islem-rehberi`

## 6.2 Kimlik ekranları

- `/giris`
- `/kayit`
- `/e-posta-dogrula`
- `/sifremi-unuttum`
- `/sifre-yenile`
- `/oturumlar`

## 6.3 Onboarding

- `/onboarding/rol`
- `/onboarding/isletme`
- `/onboarding/adres`
- `/onboarding/belgeler`
- `/onboarding/sozlesmeler`
- `/onboarding/inceleme`

Adımlar kaydedilebilir ve sonra devam edilebilir.

## 6.4 Alıcı paneli

- `/panel`
- `/panel/kesfet`
- `/panel/favoriler`
- `/panel/listeler`
- `/panel/sepet`
- `/panel/checkout`
- `/panel/siparisler`
- `/panel/siparisler/[id]`
- `/panel/teklif-talepleri`
- `/panel/teklif-talepleri/[id]`
- `/panel/mesajlar`
- `/panel/entegrasyonlar`
- `/panel/isletme`
- `/panel/uyeler`
- `/panel/adresler`
- `/panel/bildirimler`
- `/panel/ayarlar`

## 6.5 Tedarikçi paneli

- `/tedarikci`
- `/tedarikci/urunler`
- `/tedarikci/urunler/yeni`
- `/tedarikci/urunler/[id]`
- `/tedarikci/ice-aktar`
- `/tedarikci/stok`
- `/tedarikci/siparisler`
- `/tedarikci/siparisler/[id]`
- `/tedarikci/kargolar`
- `/tedarikci/teklifler`
- `/tedarikci/odemeler`
- `/tedarikci/performans`
- `/tedarikci/magaza`
- `/tedarikci/entegrasyonlar`
- `/tedarikci/uyeler`
- `/tedarikci/ayarlar`

## 6.6 Admin

- `/admin`
- `/admin/dogrulamalar`
- `/admin/isletmeler`
- `/admin/kullanicilar`
- `/admin/urunler`
- `/admin/kategoriler`
- `/admin/markalar`
- `/admin/siparisler`
- `/admin/kargolar`
- `/admin/iade`
- `/admin/uyusmazliklar`
- `/admin/odemeler`
- `/admin/mutabakat`
- `/admin/komisyonlar`
- `/admin/teklifler`
- `/admin/entegrasyonlar`
- `/admin/webhooklar`
- `/admin/importlar`
- `/admin/audit`
- `/admin/yasal`
- `/admin/ozellikler`
- `/admin/sistem`

---

# 7. TASARIM SİSTEMİ

## 7.1 Görsel dil

- profesyonel B2B,
- sade,
- güven veren,
- yoğun ama okunabilir veri tabloları,
- mobilde kullanılabilir kart yapıları,
- boş durumlar,
- skeleton,
- hata ve başarı durumları,
- koyu/açık tema isteğe bağlı.

Çalışma markası kolay değiştirilebilir olmalı. Logo ve renkleri token üzerinden yönet.

## 7.2 Erişilebilirlik

- WCAG 2.2 AA hedefle,
- klavye navigasyonu,
- görünür focus,
- doğru label/aria,
- yeterli kontrast,
- form hatalarının alanla ilişkilendirilmesi,
- yalnız renk ile durum anlatmama,
- tablo mobil alternatifi,
- reduced motion tercihi.

## 7.3 Türkçe içerik

- tüm kullanıcı metinleri doğal Türkçe,
- teknik hata kullanıcıya ham stack trace olarak gösterilmez,
- tarih `tr-TR`,
- para `Intl.NumberFormat("tr-TR", { currency: "TRY" })`,
- veritabanında zaman UTC, gösterimde Europe/Istanbul,
- “satıcı” kelimesinin platformdaki alıcı reseller ile karışmasını engelle: UI'da gerekirse “Pazaryeri Satıcısı / Alıcı İşletme” kullan.

## 7.4 Formlar

- React Hook Form + Zod,
- server-side doğrulama tekrar edilir,
- optimistic UI yalnız geri alınabilir düşük riskli işlemlerde,
- finansal ve stok işlemlerinde server confirmation zorunlu.

---

# 8. TEKNİK MİMARİ

## 8.1 Mimari yaklaşım

**Modüler monolit.**

Neden:

- MVP hızı,
- daha kolay transaction,
- daha az dağıtık sistem hatası,
- Codex ve küçük ekip için yönetilebilirlik,
- daha düşük işletme maliyeti.

Domain modüllerini sınırları net tut:

- auth,
- users,
- organizations,
- verification,
- catalog,
- pricing,
- inventory,
- carts,
- checkout,
- orders,
- shipping,
- payments,
- returns,
- disputes,
- rfq,
- messaging,
- notifications,
- integrations,
- admin,
- audit,
- legal,
- jobs.

Modüller doğrudan birbirinin Prisma tablolarına rastgele erişmemeli. Service/repository sınırları kullan.

## 8.2 Önerilen teknoloji yığını

Codex başlamadan önce resmi dokümanlardan birbirleriyle uyumlu güncel kararlı sürümleri doğrulasın, seçimi `.agent/execplan.md` içinde gerekçelendirsin ve lockfile ile sabitlesin.

- Resmi kütüphanelerin desteklediği güncel Node.js LTS.
- pnpm.
- Güncel kararlı Next.js App Router.
- Next.js ile uyumlu güncel kararlı React.
- TypeScript strict.
- Tailwind CSS.
- erişilebilir Radix/shadcn tabanlı bileşenler.
- PostgreSQL.
- Güncel kararlı Prisma ORM ve resmi yapılandırma yaklaşımı.
- Better Auth:
  - e-posta/parola,
  - e-posta doğrulama,
  - parola sıfırlama,
  - secure sessions.
- Zod.
- React Hook Form.
- Pino tabanlı structured logging.
- Vitest.
- React Testing Library.
- Playwright.
- S3 uyumlu object storage:
  - lokalde MinIO,
  - prod'da R2/S3 uyumlu sağlayıcı.
- E-posta adaptörü:
  - lokalde Mailpit/log,
  - prod için Resend veya seçilen sağlayıcı.
- OpenAPI üretimi.
- Docker Compose:
  - app,
  - postgres,
  - minio,
  - mailpit.

## 8.3 Kullanma

- MongoDB,
- Firebase'i ana veritabanı,
- client-side-only auth,
- Redux'u zorunlu global state,
- GraphQL,
- mikroservis,
- ayrı frontend/backend repo,
- finansal hesaplarda floating point.

## 8.4 Proje dizini

Öneri:

```text
src/
  app/
    (public)/
    (auth)/
    (dashboard)/
    admin/
    api/
  components/
    ui/
    shared/
  modules/
    auth/
    organizations/
    verification/
    catalog/
    pricing/
    inventory/
    carts/
    checkout/
    orders/
    shipping/
    payments/
    returns/
    disputes/
    rfq/
    messaging/
    notifications/
    integrations/
    legal/
    audit/
  lib/
    db/
    auth/
    security/
    storage/
    email/
    logging/
    money/
    time/
    validation/
  generated/
  styles/
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/
  integration/
  e2e/
docs/
.agent/
```

Her modülde mümkünse:

```text
module/
  domain/
  application/
  infrastructure/
  ui/
  index.ts
```

Fakat anlamsız katmanlar üretme. Domain kurallarını route handler içine gömmemek ana hedeftir.

## 8.5 Server Components ve Client Components

- veri okuma için varsayılan Server Component,
- client component sadece etkileşim gerektiğinde,
- server-only modülleri açıkça işaretle,
- secret veya provider tokenı client bundle'a sızdırma,
- mutation için Server Action veya Route Handler seçimini tutarlı yap,
- harici webhook ve public API için Route Handler kullan.

## 8.6 Veri erişimi

- Prisma repository/service katmanı,
- her org-scoped sorguda `organizationId`,
- “önce kaydı bul, sonra yetki kontrol et” ile bilgi sızdırma yerine mümkünse tek sorguda sahiplik filtresi,
- hassas çok adımlı işlemlerde transaction,
- listelerde cursor pagination,
- N+1 sorgu kontrolü,
- gerekli indeksler.

## 8.7 Background job ve outbox

MVP'de ayrı Redis zorunlu kılma.

Şunları oluştur:

- `outbox_events`,
- `job_runs`,
- retry/backoff,
- dead-letter durumu,
- idempotent handler,
- cron ile job processor route/command,
- local worker command.

Kullanım:

- e-posta,
- bildirim,
- webhook işleme,
- stok rezervasyonu temizleme,
- SLA kontrolü,
- marketplace senkronizasyonu,
- mutabakat,
- dosya import.

Uygulama transaction'ı ile event kaydı aynı transaction'da olmalıdır.

## 8.8 Feature flags

En az:

- `FEATURE_DROPSHIPPING`
- `FEATURE_LIVE_PAYMENTS`
- `FEATURE_MARKETPLACE_TRENDYOL`
- `FEATURE_MARKETPLACE_HEPSIBURADA`
- `FEATURE_MARKETPLACE_AMAZON_TR`
- `FEATURE_CARRIER_INTEGRATIONS`
- `FEATURE_RFQ`
- `FEATURE_REVIEWS`
- `FEATURE_MULTI_SUPPLIER_CHECKOUT`

DB ve environment override desteği olabilir. Kritik canlı özellikler varsayılan kapalıdır.

---

# 9. VERİ MODELİ

Prisma şemasını aşağıdaki domain'i karşılayacak biçimde tasarla. Better Auth'ın zorunlu tablolarını resmi adaptör yapısına göre ekle. Aşağıdaki isimler yönlendiricidir; tutarlı daha iyi isimler kullanılabilir.

## 9.1 Kimlik ve işletme

### User

- id
- name
- email
- emailVerified
- phone
- phoneVerifiedAt
- locale
- timezone
- status
- createdAt
- updatedAt
- deletedAt

### Organization

- id
- type: SUPPLIER | RESELLER | BOTH
- legalName
- tradeName
- slug
- taxNumber
- taxOffice
- mersisNumber
- kepAddress
- website
- phone
- email
- status
- verificationStatus
- verifiedAt
- suspendedAt
- createdAt
- updatedAt

Hassas kimlik alanlarının loglarda maskelenmesini sağla. Gerekli alanlarda uygulama seviyesi şifreleme değerlendir; arama/benzersizlik için ayrıca normalize hash kullanılabilir.

### OrganizationMembership

- id
- organizationId
- userId
- role
- status
- invitedBy
- joinedAt

Unique `(organizationId, userId)`.

### OrganizationInvitation

- id
- organizationId
- email
- role
- tokenHash
- expiresAt
- acceptedAt
- revokedAt

### Address

- id
- organizationId
- type
- title
- contactName
- phone
- countryCode
- city
- district
- neighborhood
- postalCode
- line1
- line2
- isDefault
- verifiedAt

### VerificationApplication

- id
- organizationId
- status
- submittedAt
- reviewedAt
- reviewedBy
- rejectionReason
- changeRequest
- riskFlags JSON
- version

### VerificationDocument

- id
- applicationId
- type
- storageKey
- originalName
- mimeType
- size
- checksum
- scanStatus
- expiresAt
- reviewedAt
- reviewedBy

## 9.2 Tedarikçi ve alıcı profilleri

### SupplierProfile

- organizationId
- description
- foundedYear
- minOrderAmountMinor
- averageHandlingDays
- neutralPackaging
- dropshippingEnabled
- returnPolicy
- returnAddressId
- vacationMode
- vacationStart
- vacationEnd

### ResellerProfile

- organizationId
- salesChannels JSON
- monthlyOrderRange
- preferredCategories
- dropshippingRequested

## 9.3 Katalog

### Category

- id
- parentId
- name
- slug
- path
- attributeSchema JSON
- isActive
- sortOrder

### Brand

- id
- name
- slug
- status
- ownerOrganizationId optional

### Product

- id
- supplierOrganizationId
- categoryId
- brandId
- title
- slug
- shortDescription
- description
- status
- originCountry
- vatRateBasisPoints
- warrantyMonths
- handlingDays
- attributes JSON
- moderationNote
- publishedAt
- createdAt
- updatedAt
- archivedAt

### ProductVariant

- id
- productId
- sku
- barcode
- title
- optionValues JSON
- weightGrams
- dimensions JSON
- packageQuantity
- moq
- quantityStep
- isDropshipEligible
- status

Unique `(supplierOrganizationId derived / product supplier, sku)` gerekirse denormalize veya composite çözüm.

### ProductImage

- id
- productId
- variantId optional
- storageKey
- altText
- sortOrder
- isPrimary

### Price

- id
- variantId
- currency
- amountMinor
- compareAtMinor
- startsAt
- endsAt
- status

### PriceTier

- id
- priceId
- minQuantity
- maxQuantity nullable
- unitAmountMinor

Çakışan tier aralıklarını engelle.

## 9.4 Stok

### Inventory

- id
- variantId
- locationId
- onHand
- reserved
- safetyStock
- version
- updatedAt

### InventoryLocation

- id
- organizationId
- addressId
- name
- type

### InventoryMovement

- id
- inventoryId
- type
- quantityDelta
- referenceType
- referenceId
- reason
- actorUserId
- createdAt

Immutable.

### StockReservation

- id
- inventoryId
- checkoutId
- quantity
- status
- expiresAt
- releasedAt
- consumedAt

## 9.5 Sepet, checkout ve sipariş

### Cart

- id
- buyerOrganizationId
- supplierOrganizationId
- currency
- updatedAt

### CartItem

- id
- cartId
- variantId
- quantity
- addedUnitPriceMinor optional
- createdAt
- updatedAt

### Checkout

- id
- buyerOrganizationId
- currency
- status
- deliveryAddressSnapshot JSON
- invoiceAddressSnapshot JSON
- fulfillmentMode
- subtotalMinor
- vatMinor
- shippingMinor
- discountMinor
- totalMinor
- expiresAt
- idempotencyKey
- createdAt

### Order

- id
- publicNumber
- checkoutId
- buyerOrganizationId
- supplierOrganizationId
- status
- fulfillmentMode
- currency
- subtotalMinor
- vatMinor
- shippingMinor
- discountMinor
- commissionMinor
- providerFeeMinor
- totalMinor
- supplierNetMinor
- deliveryAddressSnapshot JSON
- invoiceAddressSnapshot JSON
- acceptedAt
- shipByAt
- shippedAt
- deliveredAt
- completedAt
- cancelledAt
- createdAt
- updatedAt

### OrderItem

- id
- orderId
- productId
- variantId
- titleSnapshot
- skuSnapshot
- variantSnapshot JSON
- imageSnapshot
- quantity
- unitPriceMinor
- vatRateBasisPoints
- subtotalMinor
- vatMinor
- totalMinor
- commissionMinor
- fulfillmentSnapshot JSON

### OrderStatusHistory

- id
- orderId
- fromStatus
- toStatus
- reasonCode
- note
- actorType
- actorId
- metadata JSON
- createdAt

## 9.6 Ödeme

### Payment

- id
- checkoutId
- provider
- providerPaymentId
- status
- currency
- amountMinor
- paidAt
- failedAt
- failureCode
- providerDataRedacted JSON
- createdAt
- updatedAt

### PaymentSplit

- id
- paymentId
- orderId
- supplierOrganizationId
- grossMinor
- commissionMinor
- supplierNetMinor
- providerTransactionId
- settlementStatus

### Refund

- id
- paymentId
- orderId
- returnRequestId optional
- providerRefundId
- status
- amountMinor
- reason
- requestedBy
- createdAt
- completedAt

### Payout

- id
- supplierOrganizationId
- provider
- providerPayoutId
- status
- amountMinor
- periodStart
- periodEnd
- expectedAt
- paidAt

### ProviderWebhookEvent

- id
- provider
- providerEventId
- type
- payloadEncryptedOrRedacted JSON
- signatureValid
- status
- attempts
- receivedAt
- processedAt
- error

Unique `(provider, providerEventId)`.

### CommissionRule

- id
- scopeType
- scopeId optional
- percentageBasisPoints
- fixedMinor
- startsAt
- endsAt
- priority
- status

## 9.7 Kargo

### Shipment

- id
- orderId
- provider
- providerShipmentId
- trackingNumber
- trackingUrl
- status
- packageCount
- weightGrams
- desi
- labelStorageKey
- shippedAt
- deliveredAt
- lastSyncedAt

### ShipmentEvent

- id
- shipmentId
- providerEventId
- status
- description
- location
- occurredAt
- rawDataRedacted JSON

## 9.8 İade ve uyuşmazlık

### ReturnRequest

- id
- orderId
- status
- reasonCode
- description
- requestedByUserId
- requestedAt
- approvedAt
- receivedAt
- resolvedAt
- refundAmountMinor
- restockDecision

### ReturnItem

- id
- returnRequestId
- orderItemId
- quantity
- resolution

### Dispute

- id
- orderId
- returnRequestId optional
- openedByOrganizationId
- againstOrganizationId
- category
- status
- description
- resolution
- resolvedBy
- createdAt
- resolvedAt

### EvidenceFile

- id
- disputeId optional
- returnRequestId optional
- storageKey
- mimeType
- checksum
- uploadedBy
- createdAt

## 9.9 RFQ ve mesajlaşma

### RequestForQuote

- id
- buyerOrganizationId
- title
- categoryId
- status
- targetQuantity
- targetPriceMinor
- deliveryCity
- neededBy
- expiresAt
- description
- visibility

### QuoteInvitation

- id
- rfqId
- supplierOrganizationId
- status
- invitedAt

### Quote

- id
- rfqId
- supplierOrganizationId
- status
- unitPriceMinor
- minQuantity
- handlingDays
- shippingTerms
- validUntil
- note

### Conversation

- id
- type
- orderId optional
- rfqId optional
- supportTicketId optional
- createdAt

### ConversationParticipant

- conversationId
- userId
- organizationId optional
- role

### Message

- id
- conversationId
- senderUserId optional
- type
- body
- createdAt
- editedAt
- deletedAt

### MessageAttachment

- id
- messageId
- storageKey
- mimeType
- size

## 9.10 Entegrasyon ve operasyon

### IntegrationConnection

- id
- organizationId
- provider
- type
- status
- credentialsEncrypted
- externalAccountId
- lastSyncAt
- errorCode
- createdAt
- updatedAt

### ExternalListing

- id
- connectionId
- variantId
- externalProductId
- externalSku
- status
- lastPushedAt
- lastPulledAt
- syncError

### SyncJob

- id
- connectionId
- type
- status
- cursor
- stats JSON
- error
- startedAt
- finishedAt

### ImportJob

- id
- organizationId
- type
- storageKey
- status
- totalRows
- validRows
- invalidRows
- errorReportStorageKey
- createdBy
- createdAt
- completedAt

### OutboxEvent

- id
- topic
- aggregateType
- aggregateId
- payload JSON
- status
- attempts
- availableAt
- processedAt
- lastError

## 9.11 Yasal, izin ve denetim

### LegalDocument

- id
- type
- version
- title
- contentMarkdown
- effectiveAt
- status
- checksum

### LegalAcceptance

- id
- legalDocumentId
- userId
- organizationId optional
- acceptedAt
- ipHash
- userAgentHash

### ConsentRecord

- id
- userId
- type
- status
- source
- textVersion
- capturedAt
- withdrawnAt
- evidence JSON

### AuditLog

- id
- actorType
- actorId
- organizationId optional
- action
- targetType
- targetId
- beforeRedacted JSON
- afterRedacted JSON
- ipHash
- requestId
- createdAt

Audit kayıtları normal kullanıcı tarafından değiştirilemez.

### IdempotencyRecord

- id
- scope
- key
- requestHash
- responseStatus
- responseBodyRedacted
- expiresAt
- createdAt

---

# 10. API TASARIMI

## 10.1 İlkeler

- `/api/v1`,
- REST,
- JSON,
- tutarlı hata formatı,
- request ID,
- cursor pagination,
- idempotency,
- OpenAPI,
- versioning,
- rate limits,
- object-level authorization,
- Zod ile request/response şemaları.

Hata formatı:

```json
{
  "error": {
    "code": "INVENTORY_INSUFFICIENT",
    "message": "İstenen miktar için yeterli stok bulunmuyor.",
    "fieldErrors": {},
    "requestId": "req_..."
  }
}
```

## 10.2 Temel endpoint grupları

- `/api/v1/auth/*`
- `/api/v1/organizations`
- `/api/v1/organizations/:id/members`
- `/api/v1/verifications`
- `/api/v1/products`
- `/api/v1/categories`
- `/api/v1/brands`
- `/api/v1/inventory`
- `/api/v1/carts`
- `/api/v1/checkouts`
- `/api/v1/orders`
- `/api/v1/orders/:id/transitions`
- `/api/v1/shipments`
- `/api/v1/payments`
- `/api/v1/refunds`
- `/api/v1/returns`
- `/api/v1/disputes`
- `/api/v1/rfqs`
- `/api/v1/quotes`
- `/api/v1/conversations`
- `/api/v1/notifications`
- `/api/v1/imports`
- `/api/v1/integrations`
- `/api/v1/admin/*`
- `/api/v1/webhooks/payments/:provider`
- `/api/v1/webhooks/shipping/:provider`
- `/api/v1/webhooks/marketplaces/:provider`

## 10.3 Idempotency

Zorunlu:

- checkout oluşturma,
- ödeme başlatma,
- sipariş durum geçişi,
- refund,
- webhook,
- import,
- stok ayarı.

`Idempotency-Key` aynı body ile tekrar gelirse aynı güvenli sonucu dön. Aynı key farklı body ile gelirse 409.

## 10.4 Webhook güvenliği

- raw body korunmalı,
- imza doğrulama,
- timestamp/replay koruması,
- provider event ID dedup,
- hızlı 2xx ve async processing,
- payload redaction,
- başarısız event retry,
- admin replay butonu,
- replay de idempotent.

---

# 11. PAZARYERİ ENTEGRASYON MİMARİSİ

## 11.1 Ortak adaptör

```ts
interface MarketplaceChannelAdapter {
  validateConnection(input: ConnectionCredentials): Promise<ConnectionHealth>;
  pullOrders(input: PullOrdersInput): Promise<PullOrdersResult>;
  pullListings(input: PullListingsInput): Promise<PullListingsResult>;
  pushListing(input: PushListingInput): Promise<PushListingResult>;
  updatePriceAndStock(input: UpdatePriceStockInput): Promise<BatchResult>;
  pushShipment(input: PushShipmentInput): Promise<void>;
  pushInvoice(input: PushInvoiceInput): Promise<void>;
  handleWebhook(input: RawWebhookInput): Promise<MarketplaceWebhookEvent>;
}
```

## 11.2 Canonical mapping

Harici pazar yeri verisini doğrudan domain tablolarına yığma.

Oluştur:

- canonical product,
- external listing,
- category mapping,
- brand mapping,
- attribute mapping,
- status mapping,
- error mapping,
- sync cursor,
- rate limit budget.

## 11.3 Trendyol

- Resmi geliştirici dokümanını ve `llms.txt`/OpenAPI indeksini kullan.
- Product V1 10 Ağustos 2026 itibarıyla kullanım dışı olacağından V1 endpointlerine yeni kod yazma.
- Product V2,
- stok/fiyat,
- sipariş,
- shipment package stream,
- webhook,
- fatura
akışlarını güncel dokümana göre tasarla.
- API credentials şifreli saklanır.
- Rate limit, batch request ve async sonuç kontrolü uygulanır.

## 11.4 Hepsiburada

- Resmi API Portal'ı kullan.
- katalog, ürün feed, sipariş, fatura ve kargo modüllerini ayrı adapter servislerinde tut.
- Feed işlemlerinin async sonucunu takip et.

## 11.5 Amazon Türkiye

- Resmi Selling Partner API kullan.
- Türkiye marketplace ID: resmi kaynakta doğrula; sabit kullanılsa bile config üzerinden yönet.
- Orders API'nin güncel sürümünü kullan; eski v0 sürümüne yeni entegrasyon yazma.
- Listings Items, Product Type Definitions, Catalog Items, Notifications ve Sellers API gereksinimlerini göz önünde bulundur.
- Restricted Data Token gerektiren PII endpointlerinde Amazon güvenlik gereksinimlerine uy.
- Token ve refresh tokenlar şifreli saklanır.

## 11.6 MVP davranışı

MVP'de entegrasyon ekranları:

- sağlayıcı kartı,
- bağlantı durumu,
- bağlan/kimlik bilgisi gir,
- test et,
- son senkronizasyon,
- hata logu,
- senkronize et butonu.

Gerçek credentials yoksa `MockMarketplaceChannelAdapter` ile demo akışı çalışmalı. En az bir CSV ürün dışa aktarma formatı tamamlanmalıdır.

---

# 12. HUKUKİ VE UYUMLULUK HAZIRLIĞI

Bu bölüm canlıya çıkış checklist'idir. Kod “hukuken tamamen uyumlu” iddiasında bulunmamalıdır.

## 12.1 Elektronik ticaret aracı hizmet sağlayıcı hazırlığı

Platformun fonksiyonuna göre Türkiye'de ETAHS olarak değerlendirilmesi muhtemeldir. Şunları ürün ve operasyon gereksinimi kabul et:

- faaliyete başlamadan önce ETBİS kayıt değerlendirmesi,
- KEP adresi,
- platform ve satıcı/toptancı tanıtıcı bilgileri,
- sipariş öncesi açık toplam bedel,
- sipariş özetini görme ve hatayı düzeltme araçları,
- işlem rehberi,
- sözleşmelere sonradan erişim ve saklama politikası,
- aracılık sözleşmesinin sürümlü kabulü,
- tedarikçiyle kolay ve ücretsiz dahili iletişim sistemi,
- fikri ve sınai mülkiyet ihlal bildirim mekanizması,
- haksız ticari uygulamalardan kaçınma,
- sıralama ve sponsorlu içerik şeffaflığı,
- sipariş ve işlem kayıtlarının saklanması,
- gerekli satıcı tanıtıcı bilgilerini mağaza sayfasında gösterme.

Yasal metinlerde placeholder oluştur; “hukukçu onayı bekliyor” etiketi sadece geliştirme ortamında görünür olsun. Canlıya geçiş flag'i hukuk onayı olmadan açılamasın.

## 12.2 ETBİS verisi için sistem envanteri

Admin `legal-readiness` ekranı veya dokümanı şu bilgileri listeleyebilsin:

- ödeme sağlayıcıları,
- kargo/lojistik sağlayıcıları,
- altyapı sağlayıcıları,
- veritabanı ve kişisel veri saklama ülkesi,
- depo/üretim yeri,
- alan adları,
- e-ticaret türü,
- ödeme yöntemleri.

Bunlar ETBİS bildiriminde gerekli olabilecek operasyon verilerinin güncel tutulmasına yardım eder.

## 12.3 KVKK

- veri işleme envanteri için `docs/data-processing-inventory.md` oluştur,
- amaç, veri kategorisi, ilgili kişi, hukuki sebep, alıcı grubu, saklama süresi, güvenlik tedbiri alanları,
- veri minimizasyonu,
- role-based access,
- şifreleme,
- erişim logu,
- veri ihlali runbook,
- ilgili kişi başvuru süreci,
- veri dışa aktarma,
- düzeltme,
- silme/anonimleştirme,
- saklama ve imha politikası,
- alt işleyen/servis sağlayıcı listesi,
- yurt dışına aktarım değerlendirmesi.

Aydınlatma metni ile açık rıza metnini tek checkbox'ta birleştirme. 2026 KVKK ilke kararındaki ayrıştırma yaklaşımına göre ayrı kayıtlar oluştur.

## 12.4 Çerezler

- zorunlu çerezler ayrı,
- analitik/pazarlama çerezleri varsayılan kapalı,
- tercihleri sonradan değiştirme,
- consent versioning,
- rıza vermeden izleme scripti yüklememe,
- admin ve auth güvenlik çerezlerini doğru sınıflandırma,
- cookie policy.

## 12.5 Ticari elektronik ileti ve İYS

- işlem mesajları ile pazarlama mesajları ayrı,
- e-posta/SMS pazarlama onayı ayrı,
- reddetme kolay,
- İYS veri eşlemesi ve entegrasyon için hazır yapı,
- onay kanıtı ve metin sürümü.

## 12.6 B2B ve tüketici ayrımı

- Platform MVP'sinde alıcı işletmedir.
- B2B iade/iptal şartları aracılık ve satış sözleşmesine dayanır.
- Dropshipping açılırsa nihai tüketici siparişi, alıcı reseller'ın kendi satış kanalı üzerinden oluşur.
- Reseller nihai tüketiciye karşı satıcıdır.
- Platformun tüketici PII işlemesi, satıcı ve tedarikçi arasındaki rol dağılımı, fatura, cayma ve iade sorumlulukları sözleşmeyle tanımlanmalıdır.
- Sistemde “dropshipping aç” butonu, ilgili ek sözleşme kabul edilmeden etkinleşmez.

## 12.7 Fatura ve vergi

- Her siparişte fatura sorumlusu alanı bulunur.
- MVP'de fatura PDF/XML yükleme.
- Sonraki fazda GİB lisanslı özel entegratör adaptörü.
- Platform komisyonu için platformun tedarikçiye keseceği hizmet faturası operasyonu dokümante edilir.
- e-Fatura/e-Arşiv yükümlülüğü işletme bazında mali müşavir tarafından belirlenir.
- Uygulama vergi danışmanı gibi otomatik kesin hüküm vermez.

## 12.8 Fikri mülkiyet ve yasaklı ürünler

- hak ihlali bildirim formu,
- belge yükleme,
- ürün askıya alma,
- karşı bildirim,
- tekrar ihlal politikası,
- marka yetki belgesi,
- yasaklı/kısıtlı kategori politikası,
- ürün güvenliği/geri çağırma operasyonu.

---

# 13. GÜVENLİK

OWASP Top 10:2025, OWASP API Security Top 10 ve ASVS 5.0 Level 2'yi hedefle.

## 13.1 Kimlik ve oturum

- secure, httpOnly, sameSite cookies,
- production HTTPS,
- session rotation,
- CSRF koruması,
- password reset token hash,
- e-mail verification token hash,
- kullanıcı enumeration önleme,
- brute-force rate limit,
- şüpheli oturum yönetimi,
- admin için 2FA,
- hassas aksiyonlarda yeniden doğrulama.

## 13.2 Yetkilendirme

- deny by default,
- server-side,
- her nesne erişiminde org scope,
- admin rol matrisini merkezi tanımla,
- BOLA/BFLA testleri,
- toplu endpointlerde her kaydı ayrı yetkilendir,
- storage signed URL üretiminde kaynak sahipliği kontrolü.

## 13.3 Girdi ve çıktı

- Zod,
- HTML sanitize,
- SQL injection ORM yanında raw query kontrolü,
- dosya MIME magic-byte doğrulama,
- SVG yüklemeyi yasakla veya sanitize et,
- dosya boyutu,
- zip bomb koruması,
- CSV formula injection koruması,
- Excel export hücrelerini `=`, `+`, `-`, `@` ile başlıyorsa güvenli hale getir,
- SSRF koruması: kullanıcı URL'sini sunucudan körlemesine fetch etme.

## 13.4 Finans ve stok

- integer minor unit,
- double-entry benzeri immutable finansal ledger değerlendir,
- kritik hesaplamaları tek servis,
- idempotency,
- transaction,
- optimistic concurrency/version,
- webhook doğrulama,
- redirect'e güvenmeme,
- refund ve payout için admin 2FA/re-auth,
- manuel stok ayarında neden zorunlu.

## 13.5 Secret ve şifreleme

- `.env` commit edilmez,
- `.env.example` sadece isimler,
- credentials uygulama seviyesi envelope encryption ile saklanabilir,
- encryption key environment/KMS,
- loglarda token, parola, kart, VKN, IBAN ve adres maskeleme,
- farklı ortamlar için ayrı secret.

## 13.6 Güvenlik başlıkları

- CSP,
- HSTS,
- X-Content-Type-Options,
- Referrer-Policy,
- Permissions-Policy,
- frame-ancestors,
- ödeme sağlayıcı iframe gereksinimleri varsa CSP allowlist.

## 13.7 Denetim ve alarm

Alarm üret:

- çok sayıda başarısız giriş,
- admin rol değişikliği,
- işletme banka/ödeme hesabı değişikliği,
- yüksek tutarlı refund,
- webhook imza hatası,
- stokta olağandışı düşüş,
- çok sayıda sipariş iptali,
- integration token hatası.

---

# 14. PERFORMANS VE GÜVENİLİRLİK

Hedefler:

- katalog public sayfa p75 LCP < 2.5 s makul üretim ortamında,
- dashboard temel sayfa p95 server response < 800 ms, ağır raporlar hariç,
- API p95 < 500 ms, harici sağlayıcı çağrıları hariç,
- hata oranı < %1,
- checkout ve ödeme işlemleri trace edilebilir.

Uygula:

- doğru DB indeksleri,
- cursor pagination,
- image optimization,
- cache yalnız güvenli public veride,
- kişiye özel veriyi shared cache'e koymama,
- timeout,
- retry yalnız idempotent operasyonlarda,
- circuit breaker veya basit sağlayıcı hata koruması,
- health/readiness endpoint,
- DB backup ve restore dokümanı.

---

# 15. GÖZLEMLENEBİLİRLİK

- request ID,
- structured JSON logs,
- actor/user/org ID'leri gerektiği kadar ve maskeli,
- domain event adı,
- provider latency,
- job retry,
- ödeme ve stok correlation ID,
- error tracking adaptörü,
- basic metrics endpoint veya provider entegrasyonu,
- audit log ile application log ayrımı.

Loglarda tam adres, belge, token, kart verisi, parola, ham webhook secret bulunmaz.

---

# 16. TEST STRATEJİSİ

## 16.1 Birim testleri

- para hesaplama,
- fiyat tier seçimi,
- MOQ/step,
- komisyon,
- stok availability,
- order state machine,
- permission matrix,
- refund hesaplama,
- SLA tarihleri,
- consent logic.

## 16.2 Entegrasyon testleri

Gerçek PostgreSQL test database kullan:

- organization isolation,
- verification transitions,
- product publish,
- stock reservation concurrency,
- checkout idempotency,
- payment webhook duplicate,
- refund,
- return flow,
- outbox,
- import.

## 16.3 E2E

Playwright:

1. tedarikçi kayıt ve şirket başvurusu,
2. admin onayı,
3. ürün oluşturma/yayın,
4. alıcı kayıt ve onay,
5. ürün arama,
6. sepete ekleme,
7. mock ödeme,
8. tedarikçi kabul,
9. manuel kargo,
10. teslimat,
11. iade talebi,
12. admin uyuşmazlık.

## 16.4 Güvenlik testleri

- başka org ürününü güncelleme 403/404,
- başka org siparişini görme engeli,
- admin endpoint role bypass,
- IDOR/BOLA,
- webhook sahte imza,
- tekrar webhook,
- CSRF,
- rate limit,
- CSV injection,
- zararlı dosya türü,
- open redirect.

## 16.5 Kalite kapısı

Aşağıdakiler geçmeden faz tamamlanmaz:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

CI'da e2e ayrı job olabilir; fakat lokal çalışma dokümante edilmelidir.

Kod kapsamı tek başarı ölçütü değildir; kritik domain servislerinde yüksek anlamlı kapsam hedefle.

---

# 17. SEED VE DEMO

Seed oluştur:

- 1 super admin,
- 1 operations admin,
- 3 doğrulanmış tedarikçi,
- 2 doğrulanmış alıcı,
- 1 incelemede işletme,
- kategori ağacı,
- 5 marka,
- en az 30 ürün,
- varyant ve kademeli fiyatlar,
- stok kayıtları,
- farklı durumlarda siparişler,
- ödeme/kargo/iade örnekleri,
- RFQ ve mesajlar.

Demo hesap bilgilerini yalnız development README'de ver. Production seed admin parolası oluşturma.

---

# 18. DOSYA İÇE/DIŞA AKTARMA

## 18.1 Ürün şablonu

Kolonlar:

- supplier_sku
- barcode
- title
- brand
- category_path
- variant_name
- option_1_name
- option_1_value
- option_2_name
- option_2_value
- description
- vat_rate
- unit_price
- moq
- quantity_step
- stock
- safety_stock
- handling_days
- weight_grams
- image_urls
- dropshipping_eligible

## 18.2 Import akışı

1. dosya yükleme,
2. format ve virüs kontrolü,
3. parse,
4. normalize,
5. validasyon,
6. kategori/marka eşleme,
7. önizleme,
8. onay,
9. batch upsert,
10. sonuç ve hata raporu.

Harici image URL'lerini otomatik fetch etmek SSRF riski yaratır. Varsayılan olarak URL'den görsel indirme kapalı olsun; açılırsa allowlist, DNS/IP kontrolü, boyut ve content-type kontrolü uygula.

---

# 19. ANALİTİK OLAYLAR

PII içermeyen event taksonomisi:

- `product_viewed`
- `supplier_viewed`
- `search_performed`
- `product_favorited`
- `cart_item_added`
- `checkout_started`
- `payment_succeeded`
- `order_placed`
- `order_confirmed`
- `shipment_created`
- `order_delivered`
- `return_requested`
- `rfq_created`
- `quote_submitted`

Analitik çerez onayı gerektiren sağlayıcılar consent sonrası yüklenir. İlk sürümde privacy-friendly server-side aggregate tercih edilebilir.

---

# 20. İŞ KURALLARI — KESİN

1. Para `number` float ile hesaplanmaz; integer minor unit veya güvenli decimal kullan.
2. Currency her finans kaydında bulunur.
3. Sipariş snapshot'ı immutable.
4. Tedarikçi doğrulanmadan ürün yayınlayamaz.
5. Alıcı doğrulanmadan ödeme yapamaz.
6. Tek sepet tek tedarikçi.
7. Checkout stock reservation olmadan ödeme başlatamaz.
8. Ödeme başarısı redirect query parametresinden belirlenmez.
9. Webhook idempotent.
10. Durum değişimleri state machine dışında yapılamaz.
11. Başka org verisi yalnız platform yetkisiyle görülebilir.
12. Silme finans/sipariş kayıtlarında hard delete değildir.
13. Ürün arşivleme geçmiş siparişi bozmaz.
14. PII loglanmaz.
15. Pazarlama onayı zorunlu işlem mesajına şart koşulmaz.
16. Dropshipping sözleşmesi olmadan son müşteri adresi tedarikçiye açılmaz.
17. CSV export injection-safe.
18. Canlı ödeme feature flag ve environment doğrulaması olmadan açılamaz.
19. Provider credential admin UI'da geri okunabilir düz metin gösterilmez.
20. Tüm admin aksiyonları audit edilir.

---

# 21. UYGULAMA FAZLARI

## Faz 0 — Repo, plan ve çalışan iskelet

- Next.js kur,
- pnpm,
- TypeScript strict,
- lint/format,
- Docker Compose,
- PostgreSQL,
- MinIO,
- Mailpit,
- env validation,
- CI,
- AGENTS ve ExecPlan,
- README başlangıç.

## Faz 1 — Kimlik, işletme ve RBAC

- Better Auth,
- e-mail doğrulama,
- parola reset,
- organization/membership,
- onboarding,
- verification,
- admin approval,
- audit,
- private document upload.

Kabul:

- iki ayrı org birbirinin verisini göremez,
- admin doğrulama yapabilir,
- e2e onboarding çalışır.

## Faz 2 — Katalog, fiyat, stok

- category/brand,
- product/variant/image,
- tier price,
- inventory ledger,
- admin moderation,
- public catalog,
- search/filter,
- CSV import/export.

Kabul:

- doğrulanmış tedarikçi ürün yayınlar,
- alıcı arar ve fiyat görür,
- stok yarış koşulu test edilir.

## Faz 3 — Sepet, checkout, mock ödeme

- cart,
- checkout,
- reservation,
- address snapshot,
- pricing/commission,
- MockMarketplacePaymentProvider,
- payment webhook simulator,
- order creation.

Kabul:

- duplicate checkout/payment siparişi çoğaltmaz,
- başarısız ödeme rezervasyonu salar,
- başarılı ödeme stok düşer.

## Faz 4 — Sipariş ve kargo

- supplier order panel,
- state machine,
- manual shipping,
- tracking,
- notifications,
- SLA.

Kabul:

- tam sipariş yolculuğu e2e geçer.

## Faz 5 — İade, uyuşmazlık, mesaj

- cancellation,
- return,
- refund mock,
- dispute,
- evidence,
- conversations,
- support/admin.

## Faz 6 — RFQ ve raporlama

- RFQ,
- quote,
- quote-to-cart,
- admin metrics,
- supplier performance.

## Faz 7 — Gerçek entegrasyon hazırlığı

- payment provider adapters,
- marketplace adapter contracts,
- current official API review,
- Trendyol Product V2 skeleton/sandbox if credentials,
- Hepsiburada skeleton,
- Amazon SP-API skeleton,
- shipping adapters,
- e-invoice adapter,
- integration docs.

## Faz 8 — Hardening

- OWASP review,
- permission tests,
- rate limit,
- CSP,
- backup/restore,
- load test,
- legal readiness,
- privacy inventory,
- deployment,
- runbook.

---

# 22. KABUL KRİTERLERİ

Proje “MVP hazır” sayılabilmesi için:

- sıfırdan documented komutlarla ayağa kalkar,
- migration ve seed çalışır,
- giriş/onboarding çalışır,
- org izolasyonu testlidir,
- ürün CRUD/moderasyon çalışır,
- arama çalışır,
- tier pricing ve MOQ çalışır,
- stok rezervasyonu atomiktir,
- mock ödeme ve webhook çalışır,
- sipariş state machine çalışır,
- manuel kargo çalışır,
- iade/refund mock çalışır,
- admin paneli çalışır,
- audit log çalışır,
- private documents korunur,
- responsive tasarım,
- erişilebilir temel akış,
- CI yeşil,
- build başarılı,
- dokümantasyon tamam,
- canlı payment/marketplace özellikleri güvenli kapalı,
- yasal hazırlık checklist'i açıkça eksikleri gösterir.

---

# 23. DEPLOYMENT

Varsayılan üretim seçenekleri:

### Seçenek A — Tek container/VPS

- Docker,
- managed PostgreSQL veya container dışı DB,
- S3/R2,
- reverse proxy,
- TLS,
- cron/worker process.

### Seçenek B — Vercel benzeri platform

- Next.js,
- managed PostgreSQL,
- object storage,
- cron,
- background job kısıtlarını dikkate alan outbox processor.

Her ikisi için dokümantasyon yaz.

Zorunlu prod kontrolleri:

- `NODE_ENV=production`,
- HTTPS,
- secure cookies,
- güçlü auth secret,
- encryption key,
- DB TLS,
- backup,
- domain/redirect allowlist,
- provider webhook URL,
- feature flags,
- email domain doğrulama,
- object storage private,
- legal approval flag,
- admin bootstrap güvenli süreci.

---

# 24. ENVIRONMENT DEĞİŞKENLERİ

`.env.example` en az:

```dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
APP_TIMEZONE=Europe/Istanbul

DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

AUTH_SECRET=
DATA_ENCRYPTION_KEY=
CRON_SECRET=

S3_ENDPOINT=http://localhost:9000
S3_REGION=auto
S3_BUCKET_PRIVATE=tedarikkopru-private
S3_BUCKET_PUBLIC=tedarikkopru-public
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_FORCE_PATH_STYLE=true

EMAIL_PROVIDER=log
EMAIL_FROM=
RESEND_API_KEY=

PAYMENT_PROVIDER=mock
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=

FEATURE_LIVE_PAYMENTS=false
FEATURE_DROPSHIPPING=false
FEATURE_MARKETPLACE_TRENDYOL=false
FEATURE_MARKETPLACE_HEPSIBURADA=false
FEATURE_MARKETPLACE_AMAZON_TR=false
FEATURE_CARRIER_INTEGRATIONS=false

SENTRY_DSN=
```

Env validation başlangıçta fail-fast çalışmalıdır.

---

# 25. README'DE KULLANICIYA VERİLECEK KOMUTLAR

Hedef:

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Ayrıca:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm jobs:work
pnpm openapi:generate
```

---

# 26. CODEX ÇALIŞMASININ SON RAPORU

Sonunda şunları raporla:

1. tamamlanan fazlar,
2. çalışan özellikler,
3. test sonuçları,
4. bilinen eksikler,
5. canlıya geçmeden gereken ticari hesaplar,
6. hukuk/mali müşavir incelemesi gereken maddeler,
7. güvenlik inceleme sonuçları,
8. deployment adımları,
9. demo kullanıcıları,
10. sonraki 10 öncelik.

Her önemli iddia test çıktısı, dosya yolu veya ekranla doğrulanabilir olmalıdır.

---

# 27. ARAŞTIRMA SONUÇLARINDAN ÜRÜNE YANSIYAN KRİTİK KARARLAR

## 27.1 Türkiye e-ticaret yükümlülükleri

Ticaret Bakanlığı'nın güncel içerikleri, ETAHS/ETHS düzenlemelerinde bilgi verme, aracılık sözleşmesi, dahili iletişim, fikri mülkiyet, ETBİS ve KEP gibi konuların ürün tasarımına yansıması gerektiğini gösterir. Bu nedenle platformda seller/company info, versioned contracts, işlem rehberi, internal messaging, audit ve legal-readiness modülleri vardır.

## 27.2 Ödeme

TCMB lisanslı kuruluş listesi dinamik olarak değişebilir. Canlı sağlayıcı seçimi öncesinde lisans durumu yeniden kontrol edilmelidir. iyzico ve PayTR pazaryeri çözümleri alt satıcı kaydı, tahsilat ve satıcıya aktarım akışlarını desteklediğini dokümante eder. Bu nedenle ödeme domain'i sağlayıcı adaptörlüdür ve platformun parayı kendi hesabında tutmasına dayanmaz.

## 27.3 Pazaryeri entegrasyonları

Trendyol resmi dokümanı Product V1'in 10 Ağustos 2026 itibarıyla kullanım dışı olacağını belirtir. Yeni entegrasyon Product V2 olmalıdır. Amazon Orders API v0 yerine güncel v2026-01-01 sürümü doğrulanmalıdır. Harici API sürümleri kodlanmadan önce resmi changelog okunmalıdır.

## 27.4 Codex çalışma biçimi

OpenAI dokümanları Codex'in `AGENTS.md` dosyalarını otomatik okuduğunu, karmaşık işler için yaşayan plan dokümanlarının faydalı olduğunu ve iyi yapılandırılmış geliştirme/test ortamında daha güvenilir sonuç verdiğini belirtir. Bu paket bu nedenle `AGENTS.md`, `.agent/PLANS.md` ve master prompt içerir.

---

# 28. RESMİ VE BİRİNCİL KAYNAKLAR

Codex uygulama sırasında bu sayfaların güncel sürümlerini kontrol etsin.

## Türkiye e-ticaret ve KVKK

- Ticaret Bakanlığı — Elektronik Ticaret Mevzuatı  
  https://ticaret.gov.tr/ic-ticaret/elektronik-ticaret/mevzuat

- Ticaret Bakanlığı — Elektronik Ticaret Sıkça Sorulan Sorular  
  https://ticaret.gov.tr/ic-ticaret/sikca-sorulan-sorular/elektronik-ticaret

- ETBİS  
  https://etbis.ticaret.gov.tr/

- KVKK Rehberleri  
  https://www.kvkk.gov.tr/Icerik/2030/Rehberler

- KVKK Çerez Uygulamaları ve kararları  
  https://www.kvkk.gov.tr/

- İleti Yönetim Sistemi  
  https://iys.org.tr/

- GİB e-Belge  
  https://ebelge.gib.gov.tr/

## Ödeme

- TCMB — Elektronik Para Kuruluşları / Ödeme Hizmetleri  
  https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/odeme+hizmetleri/elektronik+para+kuruluslari

- iyzico Marketplace Implementation  
  https://docs.iyzico.com/en/products/marketplace/marketplace-implementation

- PayTR Pazaryeri / Platform Transfer  
  https://dev.paytr.com/platform-transfer-talebi

## Pazaryerleri

- Trendyol Developers  
  https://developers.trendyol.com/tr

- Hepsiburada API Portal  
  https://developers.hepsiburada.com/tr/

- Amazon Selling Partner API  
  https://developer-docs.amazon.com/sp-api/

- Amazon Marketplace IDs  
  https://developer-docs.amazon.com/sp-api/docs/marketplace-ids

## Teknik

- Next.js App Router  
  https://nextjs.org/docs/app

- Prisma ORM  
  https://www.prisma.io/docs

- Better Auth  
  https://better-auth.com/docs

- OWASP Top 10:2025  
  https://owasp.org/Top10/2025/

- OWASP API Security Top 10  
  https://owasp.org/API-Security/

- OWASP ASVS  
  https://owasp.org/www-project-application-security-verification-standard/

## OpenAI Codex

- Codex CLI  
  https://developers.openai.com/codex/cli

- AGENTS.md  
  https://developers.openai.com/codex/agent-configuration/agents-md

- ExecPlans  
  https://developers.openai.com/cookbook/articles/codex_exec_plans

- Codex Prompting Guide  
  https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide

---

# 29. CODEX'E TEK SATIRLIK BAŞLATMA KOMUTU

Bu dosyalar repo köküne koyulduktan sonra Codex'e şunu söyle:

> `AGENTS.md`, `.agent/PLANS.md` ve `CODEX_MASTER_PROMPT_B2B_TEDARIK_PAZARYERI.md` dosyalarının tamamını oku. `.agent/execplan.md` oluştur. Önce Faz 0'dan başla, ardından kabul kriterlerini sağlayarak fazları sırayla uygula. Gereksiz soru sorma; belgelerdeki varsayımları kullan. Her faz sonunda lint, typecheck, test ve build çalıştır, hataları düzelt ve planı güncelle. Canlı ödeme ve harici entegrasyonları credentials ve ticari onay olmadan açma.

---

# 30. SON GÜVENLİK UYARISI

Bu platform finansal hareket, şirket belgeleri, adresler, siparişler ve ileride nihai tüketici bilgileri işleyebilir. Kod üretimi bitmiş olsa bile aşağıdakiler olmadan canlıya çıkma:

- penetrasyon testi,
- hukuk incelemesi,
- KVKK veri envanteri ve sözleşmeler,
- mali müşavir/vergi akışı,
- TCMB lisanslı ödeme kuruluşu sözleşmesi,
- kargo sözleşmeleri,
- yedek geri yükleme testi,
- olay müdahale planı,
- admin hesaplarında 2FA,
- production secret yönetimi,
- staging'de uçtan uca ödeme/iade testi.


---

# 31. FAZ SINIRLARI VE DURMA KURALI

- Her Codex çalışması yalnız bir faz görev dosyasına bağlı olmalıdır.
- Faz içinde kapsam dışı ihtiyaç görülürse kodlamak yerine `.agent/execplan.md` içindeki `Sonraki işler` bölümüne yazılmalıdır.
- Bir fazın kabul kriteri sağlanmadan yeni faza başlanmaz.
- Her faz sonunda `/review` veya bağımsız inceleme çalıştırılması önerilir.
- Kullanıcı onayı olmadan canlı ödeme, canlı e-posta, gerçek kargo veya pazaryeri kimlik bilgileri kullanılmaz.
- Tasarım ve ürün kararları gerçek kullanıcı görüşmeleriyle değişirse `DECISIONS.md` güncellenir; geçmiş kararların gerekçesi silinmez.
