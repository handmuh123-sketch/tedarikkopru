import type { VerificationStatus } from "@/generated/prisma/enums";

const transitions: Record<VerificationStatus, readonly VerificationStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW"],
  IN_REVIEW: ["NEEDS_CHANGES", "APPROVED", "REJECTED"],
  NEEDS_CHANGES: ["SUBMITTED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: [],
  SUSPENDED: ["IN_REVIEW"],
};

export function canTransitionVerification(
  from: VerificationStatus,
  to: VerificationStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertVerificationTransition(
  from: VerificationStatus,
  to: VerificationStatus,
): void {
  if (!canTransitionVerification(from, to)) {
    throw new Error(`${from} durumundan ${to} durumuna geçilemez.`);
  }
}
