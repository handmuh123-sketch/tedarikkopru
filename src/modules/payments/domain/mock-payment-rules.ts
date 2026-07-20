export const mockPaymentOutcomes = ["SUCCEEDED", "DECLINED", "CANCELLED"] as const;

export type MockPaymentOutcome = (typeof mockPaymentOutcomes)[number];
export type ReservationDisposition = "CONSUME" | "RELEASE";

export type MockPaymentDecision = {
  paymentStatus: "SUCCEEDED" | "FAILED" | "CANCELLED";
  orderStatus: "PAID" | "CANCELLED";
  checkoutStatus: "COMPLETED" | "CANCELLED";
  reservation: ReservationDisposition;
  failureCode: string | null;
};

export function mockPaymentDecision(outcome: MockPaymentOutcome): MockPaymentDecision {
  if (outcome === "SUCCEEDED") {
    return {
      paymentStatus: "SUCCEEDED",
      orderStatus: "PAID",
      checkoutStatus: "COMPLETED",
      reservation: "CONSUME",
      failureCode: null,
    };
  }
  if (outcome === "DECLINED") {
    return {
      paymentStatus: "FAILED",
      orderStatus: "CANCELLED",
      checkoutStatus: "CANCELLED",
      reservation: "RELEASE",
      failureCode: "MOCK_DECLINED",
    };
  }
  return {
    paymentStatus: "CANCELLED",
    orderStatus: "CANCELLED",
    checkoutStatus: "CANCELLED",
    reservation: "RELEASE",
    failureCode: "MOCK_CANCELLED",
  };
}
