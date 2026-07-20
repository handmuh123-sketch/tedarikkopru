import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export const emailConfig = Object.freeze({
  provider: serverEnvironment.EMAIL_PROVIDER,
  from: serverEnvironment.EMAIL_FROM,
  developmentSmtp: {
    host: serverEnvironment.EMAIL_SMTP_HOST,
    port: serverEnvironment.EMAIL_SMTP_PORT,
  },
});
