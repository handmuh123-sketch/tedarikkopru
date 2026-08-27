import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { database } from "@/lib/db/client";
import { passwordResetEmail, sendApplicationEmail, verificationEmail } from "@/lib/email/sender";
import { serverEnvironment } from "@/lib/env/server";
import { logger } from "@/lib/logging/logger";
import { betterAuthRateLimitStorage } from "@/lib/security/rate-limit";

export const auth = betterAuth({
  appName: "TedarikKöprü",
  baseURL: serverEnvironment.APP_URL,
  secret: serverEnvironment.AUTH_SECRET,
  database: prismaAdapter(database, { provider: "postgresql" }),
  trustedOrigins: [serverEnvironment.APP_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const url = `${serverEnvironment.APP_URL}/sifre-yenile?token=${encodeURIComponent(token)}`;
      try {
        await sendApplicationEmail(passwordResetEmail(user.email, url));
      } catch {
        logger.warn(
          { event: "password_reset_email_failed" },
          "Parola yenileme e-postası gönderilemedi.",
        );
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendApplicationEmail(verificationEmail(user.email, url));
      } catch {
        logger.warn({ event: "verification_email_failed" }, "Doğrulama e-postası gönderilemedi.");
      }
    },
  },
  verification: { storeIdentifier: "hashed" },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 15,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "secondary-storage",
    customStorage: betterAuthRateLimitStorage,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60 * 10, max: 10 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/send-verification-email": { window: 60 * 10, max: 3 },
      "/reset-password": { window: 60 * 10, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "tedarikkopru",
    useSecureCookies: serverEnvironment.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: serverEnvironment.NODE_ENV === "production",
      path: "/",
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
