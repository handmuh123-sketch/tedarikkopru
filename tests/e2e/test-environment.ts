import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: process.env.PLAYWRIGHT_ENV_FILE ?? ".env", override: true, quiet: true });

function requiredEnvironment(name: "DATABASE_URL" | "DEMO_ADMIN_PASSWORD" | "DEMO_USER_PASSWORD") {
  const value = process.env[name];
  if (!value) throw new Error(`E2E için ${name} .env içinde tanımlı olmalıdır.`);
  return value;
}

export const demoAdminPassword = requiredEnvironment("DEMO_ADMIN_PASSWORD");
export const demoUserPassword = requiredEnvironment("DEMO_USER_PASSWORD");
export const e2eDatabaseUrl = requiredEnvironment("DATABASE_URL");
