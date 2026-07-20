import type { FoundationCapability } from "../domain/foundation-capability";

const capabilities = [
  {
    title: "Geliştirme altyapısı",
    description: "PostgreSQL, özel nesne depolama ve e-posta yakalama servisleri tanımlı.",
    status: "hazır",
  },
  {
    title: "Gözlemlenebilirlik",
    description: "Request ID, yapılandırılmış log ve ayrı canlılık/hazırlık kontrolleri hazır.",
    status: "hazır",
  },
  {
    title: "Canlı entegrasyonlar",
    description: "Ödeme, kargo ve pazaryeri bağlantıları güvenli biçimde varsayılan kapalı.",
    status: "kapalı",
  },
] as const satisfies readonly FoundationCapability[];

export function getFoundationCapabilities(): readonly FoundationCapability[] {
  return capabilities;
}
