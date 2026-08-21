import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export const emailConfig = Object.freeze({
  provider: serverEnvironment.EMAIL_PROVIDER,
  from: serverEnvironment.EMAIL_FROM,
  smtp: {
    host: serverEnvironment.EMAIL_SMTP_HOST,
    port: serverEnvironment.EMAIL_SMTP_PORT,
    secure: serverEnvironment.EMAIL_SMTP_SECURE,
    requireTls: serverEnvironment.EMAIL_SMTP_REQUIRE_TLS,
    user: serverEnvironment.EMAIL_SMTP_USER,
    password: serverEnvironment.EMAIL_SMTP_PASSWORD,
  },
});
