# BURADAN BAŞLA — CODEX KULLANIM REHBERİ

Bu paket, projeyi Codex'e **tek seferde dev bir prompt yapıştırmak yerine**, faz faz ve test ederek yaptırmak için düzenlendi.

## En kolay yöntem: Windows ChatGPT/Codex masaüstü uygulaması

### 1. Paketi çıkar

ZIP dosyasını şu tip boş bir klasöre çıkar:

```text
C:\Projeler\TedarikKopru
```

Doğru görünüm:

```text
C:\Projeler\TedarikKopru\AGENTS.md
C:\Projeler\TedarikKopru\START_HERE_CODEX.md
C:\Projeler\TedarikKopru\docs\
C:\Projeler\TedarikKopru\tasks\
```

Yanlış görünüm, iç içe iki klasör oluşmasıdır:

```text
C:\Projeler\TedarikKopru\TedarikKopru_Codex_Pro_Paketi_v2\AGENTS.md
```

Bu da çalışabilir, ancak Codex'te **AGENTS.md'nin bulunduğu en iç klasörü** proje olarak açmalısın.

### 2. Gerekli programlar

İlk geliştirme fazında şunlar gerekir:

- Git
- güncel Node.js LTS
- Docker Desktop
- pnpm
- Codex/ChatGPT masaüstü uygulaması
- isteğe bağlı VS Code

Kurulu değillerse Codex'ten önce sistemi incelemesini ve yalnız eksik araçları güvenli biçimde kurman için komut vermesini iste. Yönetici izni isteyen veya tüm sisteme etki eden komutları körlemesine onaylama.

### 3. Codex'te klasörü aç

- ChatGPT masaüstü uygulamasında Codex bölümünü aç.
- Yeni proje/çalışma oluştur.
- **Open folder / klasör aç** seçeneğiyle `AGENTS.md` bulunan klasörü seç.
- Yerel dosyalara yazma ve proje komutlarını çalıştırma izinlerini yalnız bu klasör için ver.
- Model seçebiliyorsan mimari ve ilk fazlarda güçlü kodlama modelini, yüksek düşünme düzeyini kullan. Küçük düzeltmelerde varsayılan düzey yeterlidir.

Dosyaları mesaj kutusuna tek tek yüklemene gerek yoktur. Proje klasörünü açınca Codex dosyaları doğrudan okuyabilir.

### 4. İlk mesaj

`prompts/01_FIRST_RUN.txt` içindeki metni aynen Codex'e yapıştır.

Codex bütün ürünü bir anda yapmaya çalışırsa durdur ve şunu yaz:

```text
Yalnız tasks/PHASE_00_FOUNDATION.md kapsamını uygula. Sonraki fazlara geçme.
```

### 5. Faz bitince ne yapacaksın?

Codex'in raporunda şunları ara:

- `pnpm lint` sonucu,
- `pnpm typecheck` sonucu,
- test sonucu,
- `pnpm build` sonucu,
- değişen dosyalar,
- bilinen eksikler,
- uygulamayı açma komutu.

Sonra `prompts/02_REVIEW_PHASE.txt` mesajını çalıştır. İnceleme bulguları düzeltildikten sonra uygulamayı tarayıcıda dene.

### 6. Sonraki faz

Bir faz gerçekten çalışıyorsa `prompts/03_NEXT_PHASE.txt` içindeki `[FAZ_DOSYASI]` kısmını örneğin:

```text
tasks/PHASE_01_IDENTITY_ORGANIZATIONS.md
```

olarak değiştirip Codex'e ver.

Aynı anda iki büyük faz verme.

## `/goal` kullanımı

Codex'te `/goal` komutu görünüyorsa bir fazı uzun çalışan hedef olarak başlatabilirsin. `prompts/01_FIRST_RUN_GOAL.txt` dosyası bunun için hazırdır.

`/goal` görünmüyorsa normal ilk mesajı kullan; proje yine çalışır.

## CLI alternatifi

PowerShell aç:

```powershell
cd C:\Projeler\TedarikKopru
codex
```

İlk çalıştırmada ChatGPT hesabınla giriş yap. Daha sonra `prompts/01_FIRST_RUN.txt` içeriğini yapıştır.

Codex'i mutlaka `AGENTS.md` bulunan proje klasöründe başlat.

## GitHub/Codex cloud alternatifi

- Bu klasörü yeni, özel bir GitHub reposuna yükle.
- Codex cloud içinde o repoyu seç.
- İlk mesajı yapıştır.
- `.env`, API anahtarı, şirket belgesi veya gerçek müşteri verisi commit etme.

## Çok önemli çalışma düzeni

1. Faz 0 — temel
2. İnceleme
3. Tarayıcıda deneme
4. Faz 1
5. İnceleme
6. Tarayıcıda deneme
7. Böyle devam et

Bütün fazları tek mesajda vermek daha hızlı görünür ama hatalı mimari, geçmeyen test ve yarım entegrasyon riskini büyütür.

## Gerçek API anahtarları

Gerçek iyzico, PayTR, Trendyol veya kargo anahtarlarını prompt dosyasına yazma. Bunlar daha sonra yerel `.env` dosyasına girilir. `.env` Git'e gönderilmez.

## Ne zaman canlıya çıkılmaz?

Şunlar tamamlanmadan canlı müşteri ve para kullanma:

- hukuk/KVKK incelemesi,
- mali müşavir,
- lisanslı ödeme sağlayıcısı sözleşmesi,
- güvenlik testi,
- yedek geri yükleme testi,
- admin 2FA,
- staging ortamında uçtan uca ödeme/iade denemesi.
