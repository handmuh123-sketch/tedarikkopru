import "server-only";

import { database } from "@/lib/db/client";
import { featureFlags, serverEnvironment } from "@/lib/env/server";
import { HttpError } from "@/lib/http/errors";

import { completeMockPayment, initiateMockPayment } from "./mock-payment-service";

type RequestEvidence = {
  actorUserId: string;
  idempotencyKey: string;
  requestId: string;
  network?: string;
  now?: Date;
};

export type BankTransferDecision = "APPROVE" | "REJECT";

function assertBankTransferEnabled() {
  if (
    !featureFlags.bankTransferPayments ||
    !serverEnvironment.BANK_TRANSFER_ACCOUNT_NAME ||
    !serverEnvironment.BANK_TRANSFER_IBAN
  ) {
    throw new HttpError(404, "Banka transferi pilotu kullanılamıyor.", "BANK_TRANSFER_DISABLED");
  }
}

export function bankTransferInstructions() {
  assertBankTransferEnabled();
  return {
    accountName: serverEnvironment.BANK_TRANSFER_ACCOUNT_NAME,
    iban: serverEnvironment.BANK_TRANSFER_IBAN,
  };
}

export async function initiateBankTransfer(
  input: RequestEvidence & { buyerOrganizationId: string; orderId: string; note?: string },
) {
  assertBankTransferEnabled();
  return initiateMockPayment({
    ...input,
    provider: "BANK_TRANSFER",
    ...(input.note ? { bankTransferNote: input.note } : {}),
  });
}

export async function decideBankTransfer(
  input: RequestEvidence & { paymentId: string; decision: BankTransferDecision },
) {
  assertBankTransferEnabled();
  const payment = await database.payment.findFirst({
    where: { id: input.paymentId, provider: "BANK_TRANSFER" },
    select: { id: true, buyerOrganizationId: true, orderId: true },
  });
  if (!payment) throw new HttpError(404, "Banka transferi bulunamadı.", "BANK_TRANSFER_NOT_FOUND");
  return completeMockPayment({
    ...input,
    buyerOrganizationId: payment.buyerOrganizationId,
    orderId: payment.orderId,
    paymentId: payment.id,
    outcome: input.decision === "APPROVE" ? "SUCCEEDED" : "DECLINED",
    provider: "BANK_TRANSFER",
  });
}
