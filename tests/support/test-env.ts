const defaults: Record<string, string> = {
  NODE_ENV: "test",
  APP_URL: "http://127.0.0.1:3000",
  APP_TIMEZONE: "Europe/Istanbul",
  DATABASE_URL:
    "postgresql://tedarikkopru:local-development-only@127.0.0.1:5432/tedarikkopru?schema=public",
  DIRECT_URL:
    "postgresql://tedarikkopru:local-development-only@127.0.0.1:5432/tedarikkopru?schema=public",
  AUTH_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
  DATA_ENCRYPTION_KEY: "test-data-secret-with-at-least-thirty-two-characters",
  CRON_SECRET: "test-cron-secret-with-at-least-thirty-two-characters",
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_REGION: "auto",
  S3_BUCKET_PRIVATE: "tedarikkopru-private-test",
  S3_BUCKET_PUBLIC: "tedarikkopru-public-test",
  S3_ACCESS_KEY: "local-minio-access",
  S3_SECRET_KEY: "local-minio-secret-change-me",
  S3_FORCE_PATH_STYLE: "true",
  EMAIL_PROVIDER: "log",
  EMAIL_FROM: "noreply@localhost",
  EMAIL_SMTP_HOST: "127.0.0.1",
  EMAIL_SMTP_PORT: "1025",
  PAYMENT_PROVIDER: "mock",
  DOCUMENT_MAX_BYTES: "5242880",
};

for (const [key, value] of Object.entries(defaults)) process.env[key] ??= value;
