# Faz 1 Veri İşleme Envanteri

Bu belge geliştirme uygulamasının teknik veri envanteridir; hukuk/KVKK görüşü yerine geçmez. Canlı kullanıcı veya servis verisi kullanılmaz.

| Veri                     | Amaç                                     | Saklama/koruma                                                | Erişim                                                 | Log politikası                            |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Ad, e-posta              | Hesap, doğrulama ve üyelik               | PostgreSQL; e-posta unique                                    | Kullanıcı, aynı org yetkilisi, gerekli platform admini | E-posta loglanmaz/redact edilir           |
| Parola                   | Kimlik doğrulama                         | Better Auth scrypt hash; düz metin yok                        | Uygulama dahil geri okunamaz                           | Hiç loglanmaz                             |
| Session token            | Güvenli oturum                           | PostgreSQL, 7 gün; reset ile revoke                           | Yalnız auth altyapısı                                  | Cookie/authorization redact               |
| Verification/reset token | Tek kullanımlık e-posta işlemi           | Identifier hashli, süreli kayıt                               | Yalnız auth altyapısı                                  | URL/token loglanmaz                       |
| Davet tokenı             | Organizasyon üyeliği                     | 32 random byte; yalnız SHA-256 hash; 72 saat                  | Davet kabul endpoint'i                                 | Token loglanmaz                           |
| VKN/TCKN                 | İşletme doğrulama ve tekilleştirme       | AES-256-GCM encrypted value + normalized HMAC hash            | Yetkili server kodu                                    | VKN/tax alanları redact                   |
| İşletme/adres            | Onboarding ve doğrulama                  | PostgreSQL; orgId kapsamı                                     | Aktif org üyeleri ve gerekli adminler                  | Adres/telefon/e-posta redact              |
| Şirket belgesi           | Şirket doğrulama                         | Private MinIO; magic byte/MIME/boyut/checksum; public URL yok | Aynı org aktif üyesi veya platform doğrulama yetkilisi | Storage key/orijinal ad redact            |
| Audit log                | Güvenlik, yetki ve durum izlenebilirliği | PostgreSQL append-only trigger; redacted before/after         | Server-side yetkili süreç                              | Serbest metin gerekçe audit'e kopyalanmaz |
| IP/network               | Rate limit ve audit korelasyonu          | Rate key/audit IP yalnız HMAC hashli                          | Güvenlik altyapısı                                     | Ham IP loglanmaz                          |

## Saklama ve silme notları

- Faz 1 hard-delete kullanıcı, işletme, belge veya audit endpoint'i sunmaz.
- Audit tablosu UPDATE/DELETE işlemlerini veritabanı trigger'ıyla reddeder.
- Hukuki saklama süreleri ve veri sahibi silme/anonimleştirme süreci production öncesi hukuk/KVKK kararı gerektirir.
- Yerel geliştirme verisi Docker volume'larında kalır; normal `docker compose down` volume silmez.
