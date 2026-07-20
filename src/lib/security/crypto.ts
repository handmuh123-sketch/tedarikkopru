import "server-only";

import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from "node:crypto";

import { serverEnvironment } from "@/lib/env/server";

const ENCRYPTION_VERSION = "v1";

function encryptionKey(): Buffer {
  return createHash("sha256")
    .update(serverEnvironment.DATA_ENCRYPTION_KEY ?? "")
    .digest();
}

export function normalizeIdentifier(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
}

export function keyedHash(value: string): string {
  return createHmac("sha256", serverEnvironment.DATA_ENCRYPTION_KEY ?? "")
    .update(normalizeIdentifier(value))
    .digest("hex");
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptSensitive(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSensitive(cipherText: string): string {
  const [version, ivValue, tagValue, encryptedValue] = cipherText.split(".");
  if (version !== ENCRYPTION_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Geçersiz şifreli veri biçimi.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}
