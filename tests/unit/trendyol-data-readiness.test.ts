import { describe, expect, it, vi } from "vitest";

import {
  TrendyolMetadataClient,
  normalizeMetadataError,
} from "@/modules/marketplace/application/trendyol-metadata-client";

describe("Faz 7B Trendyol veri hazırlığı", () => {
  it("credential veya canlı flag yokken provider ağına çıkmaz", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(new TrendyolMetadataClient(null).fetchCategories()).rejects.toThrow(
      "TRENDYOL_METADATA_PREVIEW_ONLY",
    );
    expect(request).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("provider hatalarını güvenli kodlara normalize eder", () => {
    expect(normalizeMetadataError(new Response(null, { status: 401 }))).toMatchObject({
      code: "AUTHENTICATION_FAILED",
    });
    expect(normalizeMetadataError(new Response(null, { status: 429 }))).toMatchObject({
      code: "RATE_LIMITED",
    });
    expect(normalizeMetadataError(new Error("raw provider detail"))).toMatchObject({
      code: "METADATA_REQUEST_FAILED",
    });
  });
});
