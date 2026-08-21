ALTER TYPE "PaymentProvider" ADD VALUE 'BANK_TRANSFER';

ALTER TABLE "payments"
ADD COLUMN "bank_transfer_reference" VARCHAR(80),
ADD COLUMN "bank_transfer_note" VARCHAR(500);

CREATE UNIQUE INDEX "payments_bank_transfer_reference_key"
ON "payments"("bank_transfer_reference");

CREATE INDEX "payments_provider_status_created_at_idx"
ON "payments"("provider", "status", "created_at");
