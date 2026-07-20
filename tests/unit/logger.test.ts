import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger, REDACTED_VALUE } from "@/lib/logging/logger";

describe("structured logger", () => {
  it("hassas alanları yapılandırılmış logdan çıkarır", () => {
    const chunks: string[] = [];
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });
    const logger = createLogger(destination);

    logger.info(
      {
        requestId: "request-123",
        password: "never-log-password",
        req: {
          headers: {
            authorization: "Bearer never-log-token",
            cookie: "session=never-log-cookie",
          },
        },
        payload: {
          customer: {
            profile: { address: "never-log-address" },
            accessToken: "never-log-access-token",
          },
        },
        headers: { Authorization: "Bearer never-log-uppercase-authorization" },
      },
      "redaction-test",
    );

    const output = chunks.join("");
    expect(output).toContain("request-123");
    expect(output).toContain(REDACTED_VALUE);
    expect(output).not.toContain("never-log-password");
    expect(output).not.toContain("never-log-token");
    expect(output).not.toContain("never-log-cookie");
    expect(output).not.toContain("never-log-address");
    expect(output).not.toContain("never-log-access-token");
    expect(output).not.toContain("never-log-uppercase-authorization");
  });
});
