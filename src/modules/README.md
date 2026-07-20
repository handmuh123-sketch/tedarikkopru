# Modül sınırları

Uygulama modüler monolittir. Her iş alanı kendi domain/application/infrastructure/UI sınırlarını ihtiyaç oldukça açar; boş katman üretilmez.

- Bir modül başka modülün Prisma tablolarına doğrudan erişmez; açık servis veya repository sözleşmesi kullanır.
- Route Handler ve Server Component katmanları iş kuralı taşımaz, application servislerini çağırır.
- Organizasyon kapsamlı sorgular ilerleyen fazlarda tek sorguda `organizationId` ile sınırlandırılır.
- Harici ödeme, kargo, depolama, e-posta ve pazaryeri çağrıları port/adaptör arkasında tutulur.
- Faz 0 yalnız `system` modülünü içerir. Auth, organizations, catalog, pricing, inventory, checkout, orders, payments, shipping, returns, messaging, integrations ve admin modülleri ilgili faz gelmeden kodlanmaz.
