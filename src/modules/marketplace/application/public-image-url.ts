import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export function resolvePublicProductImageUrl(storageKey: string): string | null {
  const value = storageKey.trim();
  if (!value) return null;

  if (URL.canParse(value)) {
    const absolute = new URL(value);
    return absolute.protocol === "https:" ? absolute.toString() : null;
  }

  if (value.startsWith("/")) {
    const url = new URL(value, serverEnvironment.APP_URL);
    return url.protocol === "https:" ? url.toString() : null;
  }

  if (!serverEnvironment.S3_PUBLIC_BASE_URL) return null;
  const baseUrl = new URL(serverEnvironment.S3_PUBLIC_BASE_URL);
  if (baseUrl.protocol !== "https:") return null;
  return new URL(value.replace(/^\/+/, ""), `${baseUrl.toString().replace(/\/$/, "")}/`).toString();
}
