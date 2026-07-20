import { describe, expect, it } from "vitest";
import {
  assertVerificationTransition,
  canTransitionVerification,
} from "@/modules/verification/domain/state-machine";

describe("verification state machine", () => {
  it("yalnız tanımlı ileri ve yönetim geçişlerini kabul eder", () => {
    expect(canTransitionVerification("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionVerification("SUBMITTED", "IN_REVIEW")).toBe(true);
    expect(canTransitionVerification("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionVerification("NEEDS_CHANGES", "SUBMITTED")).toBe(true);
    expect(canTransitionVerification("APPROVED", "SUSPENDED")).toBe(true);
  });

  it("atlanan, geriye giden ve terminal geçişleri reddeder", () => {
    expect(canTransitionVerification("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionVerification("APPROVED", "DRAFT")).toBe(false);
    expect(canTransitionVerification("REJECTED", "SUBMITTED")).toBe(false);
    expect(() => assertVerificationTransition("SUBMITTED", "APPROVED")).toThrow();
  });
});
