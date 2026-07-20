BEGIN;

ALTER TYPE "InventoryMovementType" ADD VALUE 'SALE';
ALTER TYPE "CheckoutStatus" ADD VALUE 'PAYMENT_PROCESSING';
ALTER TYPE "CheckoutStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "StockReservationStatus" ADD VALUE 'CONSUMED';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';

CREATE TYPE "PaymentProvider" AS ENUM ('MOCK');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "PaymentAttemptOutcome" AS ENUM ('SUCCEEDED', 'DECLINED', 'CANCELLED');

ALTER TABLE "stock_reservations"
ADD COLUMN "consumed_at" TIMESTAMPTZ(3);

CREATE TABLE "order_status_history" (
  "id" VARCHAR(36) NOT NULL,
  "order_id" VARCHAR(36) NOT NULL,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "reason_code" VARCHAR(80) NOT NULL,
  "actor_type" "AuditActorType" NOT NULL,
  "actor_id" VARCHAR(36),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" VARCHAR(36) NOT NULL,
  "order_id" VARCHAR(36) NOT NULL,
  "checkout_id" VARCHAR(36) NOT NULL,
  "buyer_organization_id" VARCHAR(36) NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'MOCK',
  "mock_reference" VARCHAR(64) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
  "amount_minor" INTEGER NOT NULL,
  "initiation_idempotency_key" VARCHAR(128) NOT NULL,
  "initiation_request_hash" VARCHAR(64) NOT NULL,
  "initiated_by_user_id" VARCHAR(36) NOT NULL,
  "paid_at" TIMESTAMPTZ(3),
  "failed_at" TIMESTAMPTZ(3),
  "failure_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amount_check" CHECK ("amount_minor" > 0)
);

CREATE TABLE "payment_attempts" (
  "id" VARCHAR(36) NOT NULL,
  "payment_id" VARCHAR(36) NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "outcome" "PaymentAttemptOutcome" NOT NULL,
  "actor_user_id" VARCHAR(36) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");
CREATE UNIQUE INDEX "payments_mock_reference_key" ON "payments"("mock_reference");
CREATE UNIQUE INDEX "payments_buyer_organization_id_initiation_idempotency_key_key" ON "payments"("buyer_organization_id", "initiation_idempotency_key");
CREATE INDEX "payments_buyer_organization_id_created_at_idx" ON "payments"("buyer_organization_id", "created_at");
CREATE INDEX "payments_checkout_id_status_idx" ON "payments"("checkout_id", "status");
CREATE UNIQUE INDEX "payment_attempts_payment_id_key" ON "payment_attempts"("payment_id");
CREATE UNIQUE INDEX "payment_attempts_payment_id_idempotency_key_key" ON "payment_attempts"("payment_id", "idempotency_key");
CREATE INDEX "payment_attempts_actor_user_id_created_at_idx" ON "payment_attempts"("actor_user_id", "created_at");

ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_checkout_id_fkey"
FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_buyer_organization_id_fkey"
FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_initiated_by_user_id_fkey"
FOREIGN KEY ("initiated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "order_status_history" (
  "id", "order_id", "from_status", "to_status", "reason_code", "actor_type", "metadata", "created_at"
)
SELECT md5("id" || ':draft-created'), "id", NULL, 'DRAFT', 'checkout_draft_created', 'SYSTEM', '{}', "created_at"
FROM "orders";

CREATE FUNCTION prevent_order_status_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'order_status_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_history_append_only
BEFORE UPDATE OR DELETE ON "order_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_order_status_history_mutation();

CREATE FUNCTION prevent_payment_attempt_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'payment_attempts are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_attempts_immutable
BEFORE UPDATE OR DELETE ON "payment_attempts"
FOR EACH ROW EXECUTE FUNCTION prevent_payment_attempt_mutation();

CREATE FUNCTION prevent_payment_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'payments cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_no_delete
BEFORE DELETE ON "payments"
FOR EACH ROW EXECUTE FUNCTION prevent_payment_delete();

COMMIT;
