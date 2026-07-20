import { describe, expect, it } from "vitest";

import {
  createOpaqueToken,
  decryptSensitive,
  encryptSensitive,
  keyedHash,
  sha256,
} from "@/lib/security/crypto";
import { validatePrivateDocument } from "@/lib/storage/private-documents";
import { redactAuditValue } from "@/modules/audit/audit-service";

describe("Phase 1 security primitives", () => {
  it("opaque tokenın yalnız hashini kalıcılaştırmaya uygun üretir", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first.token).not.toBe(first.tokenHash);
    expect(first.tokenHash).toBe(sha256(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.token).not.toBe(first.token);
  });

  it("hassas veriyi authenticated encryption ile saklar", () => {
    const encrypted = encryptSensitive("1234567890");
    expect(encrypted).not.toContain("1234567890");
    expect(decryptSensitive(encrypted)).toBe("1234567890");
    expect(keyedHash("ABC")).toBe(keyedHash(" abc "));
  });

  it("audit payloadından PII ve secret alanlarını çıkarır", () => {
    expect(
      redactAuditValue({ role: "OWNER", email: "pii@example.test", nested: { token: "secret" } }),
    ).toEqual({ role: "OWNER", email: "[REDACTED]", nested: { token: "[REDACTED]" } });
  });

  it("belge MIME ile magic byte uyuşmazlığını ve HTML içeriğini reddeder", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\nfixture");
    expect(() => validatePrivateDocument(pdf, "application/pdf")).not.toThrow();
    expect(() => validatePrivateDocument(pdf, "image/png")).toThrow();
    expect(() =>
      validatePrivateDocument(new TextEncoder().encode("<html>bad</html>"), "application/pdf"),
    ).toThrow();
  });
});
