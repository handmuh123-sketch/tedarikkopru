BEGIN;

CREATE TYPE "RfqStatus" AS ENUM (
  'DRAFT', 'OPEN', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'
);

CREATE TYPE "QuoteStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TABLE "request_for_quotes" (
  "id" VARCHAR(36) NOT NULL,
  "buyer_organization_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36) NOT NULL,
  "product_id" VARCHAR(36) NOT NULL,
  "variant_id" VARCHAR(36) NOT NULL,
  "status" "RfqStatus" NOT NULL DEFAULT 'OPEN',
  "target_quantity" INTEGER NOT NULL,
  "buyer_note" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "request_for_quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "request_for_quotes_target_quantity_check" CHECK ("target_quantity" > 0)
);

CREATE TABLE "quotes" (
  "id" VARCHAR(36) NOT NULL,
  "rfq_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36) NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'OFFERED',
  "unit_price_amount_minor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
  "valid_until" TIMESTAMPTZ(3) NOT NULL,
  "supplier_note" VARCHAR(1000),
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "decision_idempotency_key" VARCHAR(128),
  "decision_request_hash" VARCHAR(64),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotes_unit_price_amount_minor_check" CHECK ("unit_price_amount_minor" > 0),
  CONSTRAINT "quotes_currency_check" CHECK ("currency" = 'TRY')
);

CREATE TABLE "rfq_status_history" (
  "id" VARCHAR(36) NOT NULL,
  "rfq_id" VARCHAR(36) NOT NULL,
  "from_status" "RfqStatus",
  "to_status" "RfqStatus" NOT NULL,
  "reason_code" VARCHAR(80) NOT NULL,
  "actor_type" "AuditActorType" NOT NULL,
  "actor_id" VARCHAR(36),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rfq_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_status_history" (
  "id" VARCHAR(36) NOT NULL,
  "quote_id" VARCHAR(36) NOT NULL,
  "from_status" "QuoteStatus",
  "to_status" "QuoteStatus" NOT NULL,
  "reason_code" VARCHAR(80) NOT NULL,
  "actor_type" "AuditActorType" NOT NULL,
  "actor_id" VARCHAR(36),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_for_quotes_buyer_organization_id_created_at_idx"
ON "request_for_quotes"("buyer_organization_id", "created_at");
CREATE INDEX "request_for_quotes_supplier_organization_id_status_created_at_idx"
ON "request_for_quotes"("supplier_organization_id", "status", "created_at");
CREATE INDEX "request_for_quotes_product_id_variant_id_idx"
ON "request_for_quotes"("product_id", "variant_id");
CREATE UNIQUE INDEX "quotes_rfq_id_supplier_organization_id_key"
ON "quotes"("rfq_id", "supplier_organization_id");
CREATE UNIQUE INDEX "quotes_supplier_organization_id_idempotency_key_key"
ON "quotes"("supplier_organization_id", "idempotency_key");
CREATE INDEX "quotes_rfq_id_status_idx" ON "quotes"("rfq_id", "status");
CREATE INDEX "quotes_supplier_organization_id_created_at_idx"
ON "quotes"("supplier_organization_id", "created_at");
CREATE INDEX "rfq_status_history_rfq_id_created_at_idx"
ON "rfq_status_history"("rfq_id", "created_at");
CREATE INDEX "quote_status_history_quote_id_created_at_idx"
ON "quote_status_history"("quote_id", "created_at");

ALTER TABLE "request_for_quotes"
ADD CONSTRAINT "request_for_quotes_buyer_organization_id_fkey"
FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_for_quotes"
ADD CONSTRAINT "request_for_quotes_supplier_organization_id_fkey"
FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_for_quotes"
ADD CONSTRAINT "request_for_quotes_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_for_quotes"
ADD CONSTRAINT "request_for_quotes_variant_id_fkey"
FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_rfq_id_fkey"
FOREIGN KEY ("rfq_id") REFERENCES "request_for_quotes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_supplier_organization_id_fkey"
FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_status_history"
ADD CONSTRAINT "rfq_status_history_rfq_id_fkey"
FOREIGN KEY ("rfq_id") REFERENCES "request_for_quotes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_status_history"
ADD CONSTRAINT "rfq_status_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_status_history"
ADD CONSTRAINT "quote_status_history_quote_id_fkey"
FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_status_history"
ADD CONSTRAINT "quote_status_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION prevent_rfq_status_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'rfq_status_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rfq_status_history_append_only
BEFORE UPDATE OR DELETE ON "rfq_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_rfq_status_history_mutation();

CREATE FUNCTION prevent_quote_status_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'quote_status_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quote_status_history_append_only
BEFORE UPDATE OR DELETE ON "quote_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_quote_status_history_mutation();

COMMIT;
