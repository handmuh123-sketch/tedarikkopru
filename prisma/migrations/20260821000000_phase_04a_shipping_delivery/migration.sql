BEGIN;

ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';

CREATE TYPE "ShipmentStatus" AS ENUM ('SHIPPED', 'DELIVERED');

CREATE TABLE "shipments" (
  "id" VARCHAR(36) NOT NULL,
  "order_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36) NOT NULL,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'SHIPPED',
  "carrier" VARCHAR(120) NOT NULL,
  "tracking_number" VARCHAR(120) NOT NULL,
  "shipped_at" TIMESTAMPTZ(3) NOT NULL,
  "estimated_delivery_at" TIMESTAMPTZ(3),
  "delivered_at" TIMESTAMPTZ(3),
  "shipping_idempotency_key" VARCHAR(128) NOT NULL,
  "shipping_request_hash" VARCHAR(64) NOT NULL,
  "delivery_idempotency_key" VARCHAR(128),
  "delivery_request_hash" VARCHAR(64),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shipments_estimated_delivery_after_shipped_check"
    CHECK ("estimated_delivery_at" IS NULL OR "estimated_delivery_at" >= "shipped_at"),
  CONSTRAINT "shipments_delivered_after_shipped_check"
    CHECK ("delivered_at" IS NULL OR "delivered_at" >= "shipped_at"),
  CONSTRAINT "shipments_delivery_idempotency_pair_check"
    CHECK (
      ("delivery_idempotency_key" IS NULL AND "delivery_request_hash" IS NULL)
      OR ("delivery_idempotency_key" IS NOT NULL AND "delivery_request_hash" IS NOT NULL)
    )
);

CREATE TABLE "shipment_status_history" (
  "id" VARCHAR(36) NOT NULL,
  "shipment_id" VARCHAR(36) NOT NULL,
  "from_status" "ShipmentStatus",
  "to_status" "ShipmentStatus" NOT NULL,
  "reason_code" VARCHAR(80) NOT NULL,
  "actor_type" "AuditActorType" NOT NULL,
  "actor_id" VARCHAR(36),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shipment_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");
CREATE UNIQUE INDEX "shipments_supplier_organization_id_shipping_idempotency_key_key"
ON "shipments"("supplier_organization_id", "shipping_idempotency_key");
CREATE UNIQUE INDEX "shipments_supplier_organization_id_delivery_idempotency_key_key"
ON "shipments"("supplier_organization_id", "delivery_idempotency_key");
CREATE INDEX "shipments_supplier_organization_id_status_created_at_idx"
ON "shipments"("supplier_organization_id", "status", "created_at");
CREATE INDEX "shipment_status_history_shipment_id_created_at_idx"
ON "shipment_status_history"("shipment_id", "created_at");

ALTER TABLE "shipments"
ADD CONSTRAINT "shipments_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments"
ADD CONSTRAINT "shipments_supplier_organization_id_fkey"
FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_status_history"
ADD CONSTRAINT "shipment_status_history_shipment_id_fkey"
FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_status_history"
ADD CONSTRAINT "shipment_status_history_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION prevent_shipment_status_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'shipment_status_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipment_status_history_append_only
BEFORE UPDATE OR DELETE ON "shipment_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_shipment_status_history_mutation();

CREATE FUNCTION prevent_shipment_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'shipments cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipments_no_delete
BEFORE DELETE ON "shipments"
FOR EACH ROW EXECUTE FUNCTION prevent_shipment_delete();

COMMIT;
