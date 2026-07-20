import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
export default function ForgotPage() {
  return (
    <AuthShell
      eyebrow="Hesap kurtarma"
      title="Parolanızı yenileyin."
      description="Hesap varlığını açığa çıkarmadan güvenli bir yenileme bağlantısı göndeririz."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
