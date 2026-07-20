import { describe, expect, it } from "vitest";

import { resolveRequestId } from "@/lib/logging/request-id";

describe("request ID", () => {
  it("güvenli istemci request ID değerini korur", () => {
    expect(resolveRequestId("checkout:01J0.test-42")).toBe("checkout:01J0.test-42");
  });

  it("geçersiz veya aşırı uzun değeri yeni UUID ile değiştirir", () => {
    const generated = resolveRequestId("invalid request id\nforged-header");

    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId("x".repeat(129))).not.toBe("x".repeat(129));
  });
});
