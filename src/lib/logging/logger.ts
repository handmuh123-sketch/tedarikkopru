import pino, { type DestinationStream, type Logger } from "pino";

export const REDACTED_VALUE = "[REDACTED]";

const sensitivePaths = [
  "authorization",
  "cookie",
  "token",
  "password",
  "secret",
  "card",
  "vkn",
  "iban",
  "address",
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "*.authorization",
  "*.cookie",
  "*.token",
  "*.password",
  "*.secret",
  "*.card",
  "*.vkn",
  "*.iban",
  "*.address",
];

const sensitiveKeyFragments = [
  "authorization",
  "cookie",
  "token",
  "password",
  "secret",
  "card",
  "vkn",
  "iban",
  "address",
  "apikey",
  "accesskey",
  "privatekey",
  "credential",
] as const;

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return sensitiveKeyFragments.some((fragment) => normalizedKey.includes(fragment));
}

function sanitizeLogValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (depth > 20) {
    return "[MAX_DEPTH]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen, depth + 1));
  }

  if (
    value === null ||
    typeof value !== "object" ||
    value instanceof Date ||
    value instanceof Error
  ) {
    return value;
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  seen.add(value);
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = isSensitiveKey(key)
      ? REDACTED_VALUE
      : sanitizeLogValue(nestedValue, seen, depth + 1);
  }

  seen.delete(value);
  return sanitized;
}

function sanitizeLogObject(object: Record<string, unknown>): Record<string, unknown> {
  return sanitizeLogValue(object, new WeakSet<object>(), 0) as Record<string, unknown>;
}

export function createLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      base: {
        service: "tedarikkopru-web",
        environment: process.env.NODE_ENV ?? "development",
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        log: sanitizeLogObject,
      },
      redact: {
        paths: sensitivePaths,
        censor: REDACTED_VALUE,
      },
    },
    destination,
  );
}

export const logger = createLogger();

export function requestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}
