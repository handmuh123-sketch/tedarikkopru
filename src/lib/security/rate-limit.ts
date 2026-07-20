import "server-only";

import type { BetterAuthRateLimitStorage, RateLimit } from "better-auth";

import { database } from "@/lib/db/client";
import { keyedHash } from "@/lib/security/crypto";

export type RateLimitDecision = { allowed: boolean; retryAfter: number | null };

type ConsumedBucket = { count: number; window_started_at: Date };

export async function consumeRateLimit(
  key: string,
  rule: { window: number; max: number },
): Promise<RateLimitDecision> {
  const keyHash = keyedHash(`rate-limit:${key}`);
  const rows = await database.$queryRaw<ConsumedBucket[]>`
    INSERT INTO rate_limit_buckets (key_hash, count, window_started_at, updated_at)
    VALUES (${keyHash}, 1, NOW(), NOW())
    ON CONFLICT (key_hash) DO UPDATE SET
      count = CASE
        WHEN rate_limit_buckets.window_started_at <= NOW() - make_interval(secs => ${rule.window}) THEN 1
        ELSE rate_limit_buckets.count + 1
      END,
      window_started_at = CASE
        WHEN rate_limit_buckets.window_started_at <= NOW() - make_interval(secs => ${rule.window}) THEN NOW()
        ELSE rate_limit_buckets.window_started_at
      END,
      updated_at = NOW()
    RETURNING count, window_started_at`;
  const bucket = rows[0];
  if (!bucket) throw new Error("Rate limit kaydı oluşturulamadı.");

  const retryAfter = Math.max(
    1,
    Math.ceil((bucket.window_started_at.getTime() + rule.window * 1000 - Date.now()) / 1000),
  );
  return {
    allowed: bucket.count <= rule.max,
    retryAfter: bucket.count <= rule.max ? null : retryAfter,
  };
}

export const betterAuthRateLimitStorage: BetterAuthRateLimitStorage = {
  async get(key) {
    const bucket = await database.rateLimitBucket.findUnique({
      where: { keyHash: keyedHash(`rate-limit:${key}`) },
    });
    if (!bucket) return null;
    return { key, count: bucket.count, lastRequest: bucket.windowStartedAt.getTime() };
  },
  async set(key, value: RateLimit) {
    await database.rateLimitBucket.upsert({
      where: { keyHash: keyedHash(`rate-limit:${key}`) },
      update: { count: value.count, windowStartedAt: new Date(value.lastRequest) },
      create: {
        keyHash: keyedHash(`rate-limit:${key}`),
        count: value.count,
        windowStartedAt: new Date(value.lastRequest),
      },
    });
  },
  consume: consumeRateLimit,
};

export function requestNetworkKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown-network";
}
