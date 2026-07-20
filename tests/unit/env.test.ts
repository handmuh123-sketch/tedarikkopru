import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "@/lib/env/schema";

const validEnvironment = {
  NODE_ENV: "development",
  APP_URL: "http://localhost:3000",
  APP_TIMEZONE: "Europe/Istanbul",
  DATABASE_URL: "postgresql://user:password@localhost:5432/app",
  DIRECT_URL: "postgresql://user:password@localhost:5432/app",
  AUTH_SECRET: "",
  DATA_ENCRYPTION_KEY: "",
  CRON_SECRET: "",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "auto",
  S3_BUCKET_PRIVATE: "private-bucket",
  S3_BUCKET_PUBLIC: "public-bucket",
  S3_ACCESS_KEY: "local-access",
  S3_SECRET_KEY: "local-secret",
  S3_FORCE_PATH_STYLE: "true",
  EMAIL_PROVIDER: "log",
  EMAIL_FROM: "noreply@localhost",
  EMAIL_SMTP_HOST: "localhost",
  EMAIL_SMTP_PORT: "1025",
  PAYMENT_PROVIDER: "mock",
  FEATURE_LIVE_PAYMENTS: "false",
  FEATURE_DROPSHIPPING: "false",
  FEATURE_MARKETPLACE_TRENDYOL: "false",
  FEATURE_MARKETPLACE_HEPSIBURADA: "false",
  FEATURE_MARKETPLACE_AMAZON_TR: "false",
  FEATURE_CARRIER_INTEGRATIONS: "false",
  FEATURE_RFQ: "false",
  FEATURE_REVIEWS: "false",
  FEATURE_MULTI_SUPPLIER_CHECKOUT: "false",
} as const;

describe("server environment", () => {
  it("false metnini boolean false olarak ayrıştırır", () => {
    const result = parseServerEnvironment(validEnvironment);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.FEATURE_LIVE_PAYMENTS).toBe(false);
      expect(result.data.S3_FORCE_PATH_STYLE).toBe(true);
      expect(result.data.EMAIL_SMTP_PORT).toBe(1025);
    }
  });

  it("production ortamında HTTPS ve güçlü temel secret değerleri ister", () => {
    const result = parseServerEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      APP_URL: "http://example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining(["APP_URL", "AUTH_SECRET", "DATA_ENCRYPTION_KEY", "CRON_SECRET"]),
      );
    }
  });

  it("loopback adresinde bile bilinen development secret değerlerini reddeder", () => {
    const result = parseServerEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      AUTH_SECRET: "local-development-auth-secret-not-for-production",
      DATA_ENCRYPTION_KEY: "local-development-data-key-not-for-production",
      CRON_SECRET: "local-development-cron-secret-not-for-production",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining(["AUTH_SECRET", "DATA_ENCRYPTION_KEY", "CRON_SECRET"]),
      );
    }
  });

  it("HTTPS production ortamında güçlü ve placeholder olmayan değerleri kabul eder", () => {
    const result = parseServerEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      APP_URL: "https://tedarikkopru.example",
      AUTH_SECRET: "3zL7vQ1nR8cM4pK9xT6wH2jF5sD0aB7eG1uN8yC4",
      DATA_ENCRYPTION_KEY: "9pT2xK6mR1vB8dH4sW7nC3fJ0qL5aG2uY6eN9kD1",
      CRON_SECRET: "5hM8cV2qA7rN1xF4pK9sD6wT3jB0uL8eR2yG7nC5",
    });

    expect(result.success).toBe(true);
  });

  it("build bağlamında runtime secret kontrolünü çalıştırmaz", () => {
    const result = parseServerEnvironment(
      {
        ...validEnvironment,
        NODE_ENV: "production",
        AUTH_SECRET: "local-development-auth-secret-not-for-production",
        DATA_ENCRYPTION_KEY: "local-development-data-key-not-for-production",
        CRON_SECRET: "local-development-cron-secret-not-for-production",
      },
      { validationContext: "build" },
    );

    expect(result.success).toBe(true);
  });

  it("canlı ödeme sağlayıcısı seçilmesine izin vermez", () => {
    const result = parseServerEnvironment({
      ...validEnvironment,
      PAYMENT_PROVIDER: "iyzico",
    });

    expect(result.success).toBe(false);
  });
});
