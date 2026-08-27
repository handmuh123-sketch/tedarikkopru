import { describe, expect, it } from "vitest";

import { calculateSupplierTrust } from "@/modules/intelligence/supplier-trust";

function delivered(onTime = true, returned = false) {
  const estimate = new Date("2026-08-20T12:00:00Z");
  return {
    status: "DELIVERED",
    shipment: {
      status: "DELIVERED",
      shippedAt: new Date("2026-08-18T12:00:00Z"),
      estimatedDeliveryAt: estimate,
      deliveredAt: new Date(onTime ? "2026-08-20T10:00:00Z" : "2026-08-21T10:00:00Z"),
    },
    returnRequests: returned ? [{ status: "REQUESTED" }] : [],
  };
}

describe("supplier trust score", () => {
  it("withholds public score until enough operations exist", () => {
    const result = calculateSupplierTrust([delivered(), delivered(), delivered(), delivered()]);

    expect(result.available).toBe(false);
    expect(result.score).toBeNull();
    expect(result.sampleSize).toBe(4);
  });

  it("scores reliable operational history highly", () => {
    const result = calculateSupplierTrust([
      delivered(),
      delivered(),
      delivered(),
      delivered(),
      delivered(),
      delivered(),
    ]);

    expect(result.available).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.metrics.acceptanceRate).toBe(100);
    expect(result.metrics.returnRate).toBe(0);
  });

  it("penalizes rejection, missed fulfillment, late delivery and returns", () => {
    const result = calculateSupplierTrust([
      delivered(false, true),
      delivered(false, true),
      {
        status: "REJECTED",
        shipment: null,
        returnRequests: [],
      },
      {
        status: "CANCELLED",
        shipment: null,
        returnRequests: [],
      },
      {
        status: "ACCEPTED",
        shipment: null,
        returnRequests: [],
      },
    ]);

    expect(result.available).toBe(true);
    expect(result.score).toBeLessThan(75);
  });
});
