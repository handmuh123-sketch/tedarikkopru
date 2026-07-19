# FAZ 8 — GÜVENLİK, YASAL HAZIRLIK VE DEPLOYMENT

## Amaç

Pilot/staging ortamına güvenli biçimde kurulabilecek ve eksikleri açıkça görünen sürüm.

## Kapsam

- threat model,
- OWASP/ASVS kontrolü,
- permission/BOLA test genişletme,
- CSP ve güvenlik başlıkları,
- rate limits,
- PII/log redaction incelemesi,
- backup/restore testi,
- health/observability,
- deployment seçenekleri,
- staging runbook,
- KVKK veri işleme envanteri taslağı,
- ETBİS/legal readiness checklist,
- incident response,
- admin 2FA,
- load/smoke test,
- final `/review`.

## Kabul kriterleri

- yüksek riskli güvenlik bulgusu yok veya açıkça bloklayıcı olarak raporlu,
- başka org erişim testleri geniş,
- backup restore kanıtlı,
- staging deploy dokümante,
- legal approval ve live payment gate kapalı,
- tüm kalite komutları geçiyor,
- final known limitations doğru,
- canlıya çıkış için insan onayı gereken maddeler listeli.
