# FAZ 1 — KİMLİK, İŞLETMELER VE DOĞRULAMA

## Amaç

Tedarikçi ve alıcı işletmelerin güvenli biçimde kayıt olup kuruluş oluşturabilmesi; adminin şirket başvurusunu inceleyebilmesi.

## Kapsam

- güncel uyumlu auth kütüphanesiyle e-posta/parola,
- e-posta doğrulama ve parola sıfırlama,
- güvenli cookie/session,
- User, Organization, Membership, Invitation,
- işletme onboarding,
- adresler,
- VerificationApplication ve private documents,
- durum state machine,
- platform ve org RBAC,
- admin doğrulama kuyruğu,
- audit log,
- session yönetimi ve rate limit,
- development e-posta akışı,
- seed demo hesapları.

## Kabul kriterleri

- tedarikçi ve alıcı kayıt akışları E2E geçer,
- admin başvuruyu onaylar/değişiklik ister/reddeder,
- Org A, Org B verisine erişemez,
- üyelik rolleri server-side uygulanır,
- private belge public URL ile açılamaz,
- parola reset tokenları güvenli saklanır,
- kritik aksiyonlar audit log üretir,
- lint/typecheck/unit/integration/E2E/build geçer.
