"use client";

import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/lib/react/use-hydrated";

type Status = { kind: "error" | "success"; message: string } | null;

export function RegisterForm() {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const data = new FormData(event.currentTarget);
    const result = await authClient.signUp.email({
      name: String(data.get("name")),
      email: String(data.get("email")),
      password: String(data.get("password")),
      callbackURL: "/panel",
    });
    setBusy(false);
    if (result.error) {
      setStatus({
        kind: "error",
        message: "Kayıt tamamlanamadı. Bilgileri kontrol edip yeniden deneyin.",
      });
      return;
    }
    window.location.assign("/panel");
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <label>
        Ad soyad
        <input name="name" autoComplete="name" required minLength={2} maxLength={120} />
      </label>
      <label>
        E-posta
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Parola
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          aria-describedby="password-help"
        />
      </label>
      <p id="password-help" className="form-help">
        En az 12 karakter kullanın; başka hesaplarda kullandığınız parolayı tekrar etmeyin.
      </p>
      {status && (
        <p className={`form-status ${status.kind}`} role="alert">
          {status.message}
        </p>
      )}
      <button className="button button-primary" disabled={busy || !hydrated}>
        {busy ? "Kaydediliyor…" : "Ücretsiz hesap oluştur"}
      </button>
    </form>
  );
}

export function LoginForm() {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
      callbackURL: "/panel",
    });
    setBusy(false);
    if (result.error) {
      setStatus({
        kind: "error",
        message: "Giriş yapılamadı. E-posta adresinizi ve parolanızı kontrol edin.",
      });
      return;
    }
    window.location.assign("/panel");
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        E-posta
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Parola
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {status && (
        <p className={`form-status ${status.kind}`} role="alert">
          {status.message}
        </p>
      )}
      <button className="button button-primary" disabled={busy || !hydrated}>
        {busy ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(data.get("email")),
      redirectTo: "/sifre-yenile",
    });
    setStatus({
      kind: "success",
      message: "Bu adres kayıtlıysa parola yenileme bağlantısı gönderildi.",
    });
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        E-posta
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {status && (
        <p className="form-status success" role="status">
          {status.message}
        </p>
      )}
      <button className="button button-primary" disabled={!hydrated}>
        Yenileme bağlantısı gönder
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) {
      setStatus({ kind: "error", message: "Bağlantı geçersiz veya süresi dolmuş." });
      return;
    }
    setStatus({ kind: "success", message: "Parolanız yenilendi. Tüm eski oturumlar kapatıldı." });
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Yeni parola
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </label>
      {status && (
        <p className={`form-status ${status.kind}`} role="alert">
          {status.message}
        </p>
      )}
      <button className="button button-primary" disabled={!token || !hydrated}>
        Parolayı yenile
      </button>
    </form>
  );
}

export function SignOutButton() {
  const hydrated = useHydrated();
  return (
    <button
      className="button button-secondary"
      disabled={!hydrated}
      onClick={async () => {
        await authClient.signOut();
        window.location.assign("/giris");
      }}
    >
      Çıkış yap
    </button>
  );
}
