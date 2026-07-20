import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell
      eyebrow="Yeni parola"
      title="Güçlü bir parola belirleyin."
      description="İşlem tamamlandığında mevcut tüm oturumlarınız güvenlik için kapatılır."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
