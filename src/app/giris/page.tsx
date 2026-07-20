import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Güvenli oturum"
      title="Tekrar hoş geldiniz."
      description="Doğrulanmış e-posta adresiniz ve parolanızla giriş yapın."
    >
      <LoginForm />
      <p className="auth-alt">
        <Link href="/sifremi-unuttum">Parolamı unuttum</Link> ·{" "}
        <Link href="/kayit">Hesap oluştur</Link>
      </p>
    </AuthShell>
  );
}
