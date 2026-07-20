import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="E-posta doğrulama"
      title="Gelen kutunuzu kontrol edin."
      description="Hesabınızı etkinleştirmek için gönderdiğimiz tek kullanımlık bağlantıyı açın. Geliştirme ortamında ileti Mailpit ekranındadır."
    >
      <p className="form-status success" role="status">
        Bağlantı bir saat geçerlidir ve kullanımdan sonra tekrar kullanılamaz.
      </p>
      <p className="auth-alt">
        <Link href="http://localhost:8025">Mailpit’i aç</Link> ·{" "}
        <Link href="/giris">Giriş sayfası</Link>
      </p>
    </AuthShell>
  );
}
