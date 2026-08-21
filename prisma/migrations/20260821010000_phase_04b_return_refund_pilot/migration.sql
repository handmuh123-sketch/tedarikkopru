ALTER TYPE "InventoryMovementType" ADD VALUE 'RETURN_RESTORE';

BEGIN;

CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'RETURN_RECEIVED');
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'OTHER');
CREATE TYPE "RefundStatus" AS ENUM ('RECORDED');

CREATE TABLE "return_requests" (
  "id" VARCHAR(36) NOT NULL,
  "order_id" VARCHAR(36) NOT NULL,
  "buyer_organization_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36) NOT NULL,
  "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" "ReturnReason" NOT NULL,
  "buyer_note" VARCHAR(1000),
  "requested_by_user_id" VARCHAR(36) NOT NULL,
  "create_idempotency_key" VARCHAR(128) NOT NULL,
  "create_request_hash" VARCHAR(64) NOT NULL,
  "decision_idempotency_key" VARCHAR(128),
  "decision_request_hash" VARCHAR(64),
  "receipt_idempotency_key" VARCHAR(128),
  "receipt_request_hash" VARCHAR(64),
  "decided_at" TIMESTAMPTZ(3),
  "received_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_requests_decision_idempotency_pair_check"
    CHECK (
      ("decision_idempotency_key" IS NULL AND "decision_request_hash" IS NULL)
      OR ("decision_idempotency_key" IS NOT NULL AND "decision_request_hash" IS NOT NULL)
    ),
  CONSTRAINT "return_requests_receipt_idempotency_pair_check"
    CHECK (
      ("receipt_idempotency_key" IS NULL AND "receipt_request_hash" IS NULL)
      OR ("receipt_idempotency_key" IS NOT NULL AND "receipt_request_hash" IS NOT NULL)
    ),
  CONSTRAINT "return_requests_decision_time_check"
    CHECK (
      "status" = 'REQUESTED'
      OR "decided_at" IS NOT NULL
    ),
  CONSTRAINT "return_requests_received_time_check"
    CHECK (
      "status" <> 'RETURN_RECEIVED'
      OR "received_at" IS NOT NULL
    )
);

CREATE TABLE "return_items" (
  "id" VARCHAR(36) NOT NULL,
  "return_request_id" VARCHAR(36) NOT NULL,
  "order_item_id" VARCHAR(36) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_items_quantity_positive_check" CHECK ("quantity" > 0)
);

CREATE TABLE "return_status_history" (
  "id" VARCHAR(36) NOT NULL,
  "return_request_id" VARCHAR(36) NOT NULL,
  "from_status" "ReturnRequestStatus",
  "to_status" "ReturnRequestStatus" NOT NULL,
  "reason_code" VARCHAR(80) NOT NULL,
  "actor_type" "AuditActorType" NOT NULL,
  "actor_id" VARCHAR(36),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "return_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
  "id" VARCHAR(36) NOT NULL,
  "return_request_id" VARCHAR(36) NOT NULL,
  "order_id" VARCHAR(36) NOT NULL,
  "payment_id" VARCHAR(36) NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'RECORDED',
  "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
  "amount_minor" INTEGER NOT NULL,
  "recorded_by_user_id" VARCHAR(36) NOT NULL,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refunds_amount_nonnegative_check" CHECK ("amount_minor" >= 0)
);

CREATE TABLE "refund_items" (
  "id" VARCHAR(36) NOT NULL,
  "refund_id" VARCHAR(36) NOT NULL,
  "order_item_id" VARCHAR(36) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_items_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "refund_items_amount_nonnegative_check" CHECK ("amount_minor" >= 0)
);

CREATE UNIQUE INDEX "return_requests_buyer_organization_id_create_idempotency_key_key"
ON "return_requests"("buyer_organization_id", "create_idempotency_key");
CREATE UNIQUE INDEX "return_requests_supplier_organization_id_decision_idempotency_key_key"
ON "return_requests"("supplier_organization_id", "decision_idempotency_key");
CREATE UNIQUE INDEX "return_requests_supplier_organization_id_receipt_idempotency_key_key"
ON "return_requests"("supplier_organization_id", "receipt_idempotency_key");
CREATE INDEX "return_requests_buyer_organization_id_status_created_at_idx"
ON "return_requests"("buyer_organization_id", "status", "created_at");
CREATE INDEX "return_requests_supplier_organization_id_status_created_at_idx"
ON "return_requests"("supplier_organization_id", "status", "created_at");
CREATE UNIQUE INDEX "return_items_return_request_id_order_item_id_key"
ON "return_items"("return_request_id", "order_item_id");
CREATE INDEX "return_items_order_item_id_idx" ON "return_items"("order_item_id");
CREATE INDEX "return_status_history_return_request_id_created_at_idx"
ON "return_status_history"("return_request_id", "created_at");
CREATE UNIQUE INDEX "refunds_return_request_id_key" ON "refunds"("return_request_id");
CREATE INDEX "refunds_order_id_created_at_idx" ON "refunds"("order_id", "created_at");
CREATE INDEX "refunds_payment_id_created_at_idx" ON "refunds"("payment_id", "created_at");
CREATE UNIQUE INDEX "refund_items_refund_id_order_item_id_key"
ON "refund_items"("refund_id", "order_item_id");
CREATE INDEX "refund_items_order_item_id_idx" ON "refund_items"("order_item_id");

ALTER TABLE "return_requests"
ADD CONSTRAINT "return_requests_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests"
ADD CONSTRAINT "return_requests_buyer_organization_id_fkey"
FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests"
ADD CONSTRAINT "return_requests_supplier_organization_id_fkey"
FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests"
ADD CONSTRAINT "return_requests_requested_by_user_id_fkey"
FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_items"
ADD CONSTRAINT "return_items_return_request_id_fkey"
FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_items"
ADD CONSTRAINT "return_items_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_status_history"
ADD CONSTRAINT "return_status_history_return_request_id_fkey"
FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_status_history"
ADD CONSTRAINT "return_status_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_return_request_id_fkey"
FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_recorded_by_user_id_fkey"
FOREIGN KEY ("recorded_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_items"
ADD CONSTRAINT "refund_items_refund_id_fkey"
FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_items"
ADD CONSTRAINT "refund_items_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_return_status_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'return_status_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_status_history_append_only
BEFORE UPDATE OR DELETE ON "return_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_return_status_history_mutation();

CREATE FUNCTION prevent_return_request_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'return_requests cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_requests_no_delete
BEFORE DELETE ON "return_requests"
FOR EACH ROW EXECUTE FUNCTION prevent_return_request_delete();

CREATE FUNCTION prevent_return_item_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'return_items cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_items_no_delete
BEFORE DELETE ON "return_items"
FOR EACH ROW EXECUTE FUNCTION prevent_return_item_delete();

CREATE FUNCTION prevent_refund_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'refunds are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refunds_immutable
BEFORE UPDATE OR DELETE ON "refunds"
FOR EACH ROW EXECUTE FUNCTION prevent_refund_mutation();

CREATE FUNCTION prevent_refund_item_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'refund_items are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refund_items_immutable
BEFORE UPDATE OR DELETE ON "refund_items"
FOR EACH ROW EXECUTE FUNCTION prevent_refund_item_mutation();

COMMIT;
