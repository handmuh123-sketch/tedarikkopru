import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Yeni hesap"
      title="İşletmenizi güvenle başlatın."
      description="Önce kişisel hesabınızı, e-posta doğrulamasından sonra işletme profilinizi oluşturun."
    >
      <RegisterForm />
      <p className="auth-alt">
        Hesabınız var mı? <Link href="/giris">Giriş yapın</Link>
      </p>
    </AuthShell>
  );
}
