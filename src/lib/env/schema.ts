import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const booleanFromEnvironment = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");

const productionPlaceholderMarkers = [
  "local-development",
  "not-for-production",
  "change-me",
  "ci-build",
  "ci-only",
] as const;

function isKnownPlaceholder(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return productionPlaceholderMarkers.some((marker) => normalizedValue.includes(marker));
}

function createServerEnvSchema(validationContext: "runtime" | "build") {
  return z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      APP_URL: z.string().url(),
      APP_TIMEZONE: z.literal("Europe/Istanbul"),

      DATABASE_URL: z.string().startsWith("postgresql://"),
      DIRECT_URL: z.string().startsWith("postgresql://"),

      AUTH_SECRET: optionalString,
      DATA_ENCRYPTION_KEY: optionalString,
      CRON_SECRET: optionalString,

      S3_ENDPOINT: z.string().url(),
      S3_REGION: z.string().trim().min(1),
      S3_BUCKET_PRIVATE: z.string().trim().min(3),
      S3_BUCKET_PUBLIC: z.string().trim().min(3),
      S3_ACCESS_KEY: z.string().trim().min(3),
      S3_SECRET_KEY: z.string().trim().min(8),
      S3_FORCE_PATH_STYLE: booleanFromEnvironment.default(true),

      EMAIL_PROVIDER: z.enum(["log", "smtp", "resend"]).default("log"),
      EMAIL_FROM: z.string().trim().min(3),
      EMAIL_SMTP_HOST: z.string().trim().min(1),
      EMAIL_SMTP_PORT: z.coerce.number().int().min(1).max(65_535),
      RESEND_API_KEY: optionalString,

      DOCUMENT_MAX_BYTES: z.coerce.number().int().min(1).max(10_485_760).default(5_242_880),
      DEMO_SEED_ENABLED: booleanFromEnvironment.default(false),
      DEMO_ADMIN_PASSWORD: optionalString,
      DEMO_USER_PASSWORD: optionalString,

      PAYMENT_PROVIDER: z.literal("mock").default("mock"),
      IYZICO_API_KEY: optionalString,
      IYZICO_SECRET_KEY: optionalString,
      IYZICO_BASE_URL: optionalString,
      PAYTR_MERCHANT_ID: optionalString,
      PAYTR_MERCHANT_KEY: optionalString,
      PAYTR_MERCHANT_SALT: optionalString,

      FEATURE_LIVE_PAYMENTS: booleanFromEnvironment.default(false),
      FEATURE_MOCK_PAYMENTS: booleanFromEnvironment.default(false),
      FEATURE_DROPSHIPPING: booleanFromEnvironment.default(false),
      FEATURE_MARKETPLACE_TRENDYOL: booleanFromEnvironment.default(false),
      FEATURE_MARKETPLACE_HEPSIBURADA: booleanFromEnvironment.default(false),
      FEATURE_MARKETPLACE_AMAZON_TR: booleanFromEnvironment.default(false),
      FEATURE_CARRIER_INTEGRATIONS: booleanFromEnvironment.default(false),
      FEATURE_RFQ: booleanFromEnvironment.default(false),
      FEATURE_REVIEWS: booleanFromEnvironment.default(false),
      FEATURE_MULTI_SUPPLIER_CHECKOUT: booleanFromEnvironment.default(false),

      SENTRY_DSN: optionalString,
    })
    .superRefine((environment, context) => {
      if (validationContext === "build") {
        return;
      }

      for (const key of ["AUTH_SECRET", "DATA_ENCRYPTION_KEY"] as const) {
        const value = environment[key];

        if (!value || value.length < 32) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: "runtime ortamında en az 32 karakterli olmalıdır",
          });
        }
      }

      if (environment.NODE_ENV !== "production") {
        return;
      }

      const appUrl = new URL(environment.APP_URL);
      const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(appUrl.hostname);

      if (appUrl.protocol !== "https:" && !isLoopback) {
        context.addIssue({
          code: "custom",
          path: ["APP_URL"],
          message: "production ortamında loopback dışı adresler HTTPS kullanmalıdır",
        });
      }

      for (const key of ["AUTH_SECRET", "DATA_ENCRYPTION_KEY", "CRON_SECRET"] as const) {
        const value = environment[key];

        if (!value || value.length < 32 || isKnownPlaceholder(value)) {
          context.addIssue({
            code: "custom",
            path: [key],
            message:
              "production ortamında en az 32 karakterli, yerel örnek olmayan bir değer olmalıdır",
          });
        }
      }
    });
}

const runtimeServerEnvSchema = createServerEnvSchema("runtime");
const buildServerEnvSchema = createServerEnvSchema("build");

export type ServerEnvironment = z.infer<typeof runtimeServerEnvSchema>;

export function parseServerEnvironment(
  input: NodeJS.ProcessEnv | Record<string, unknown>,
  options: { validationContext?: "runtime" | "build" } = {},
) {
  const schema =
    options.validationContext === "build" ? buildServerEnvSchema : runtimeServerEnvSchema;
  return schema.safeParse(input);
}
