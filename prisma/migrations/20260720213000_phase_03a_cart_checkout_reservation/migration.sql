BEGIN;

ALTER TYPE "InventoryMovementType" ADD VALUE 'RESERVATION';
ALTER TYPE "InventoryMovementType" ADD VALUE 'RESERVATION_RELEASE';
CREATE TYPE "CheckoutStatus" AS ENUM ('DRAFT', 'EXPIRED', 'CANCELLED');
CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'RELEASED');
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CANCELLED');

ALTER TABLE "organizations"
ADD COLUMN "minimum_order_amount_minor" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "organizations_minimum_order_amount_check"
CHECK ("minimum_order_amount_minor" >= 0);

ALTER TABLE "inventories"
ADD COLUMN "reserved" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "inventories" DROP CONSTRAINT "inventories_nonnegative_check";
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_nonnegative_check" CHECK (
  "on_hand" >= 0 AND "reserved" >= 0 AND "reserved" <= "on_hand"
  AND "safety_stock" >= 0 AND "version" >= 0
);

ALTER TABLE "inventory_movements"
ADD COLUMN "reserved_delta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reserved_after" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "actor_user_id" DROP NOT NULL;
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_actor_user_id_fkey";
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "carts" (
  "id" VARCHAR(36) NOT NULL,
  "buyer_organization_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36),
  "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cart_items" (
  "id" VARCHAR(36) NOT NULL,
  "cart_id" VARCHAR(36) NOT NULL,
  "variant_id" VARCHAR(36) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "added_unit_price_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cart_items_values_check" CHECK ("quantity" > 0 AND "added_unit_price_minor" >= 0)
);

CREATE TABLE "checkouts" (
  "id" VARCHAR(36) NOT NULL,
  "buyer_organization_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36) NOT NULL,
  "status" "CheckoutStatus" NOT NULL DEFAULT 'DRAFT',
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
  "subtotal_amount_minor" INTEGER NOT NULL,
  "vat_amount_minor" INTEGER NOT NULL,
  "total_amount_minor" INTEGER NOT NULL,
  "delivery_address_snapshot" JSONB NOT NULL,
  "invoice_address_snapshot" JSONB NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "checkouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checkouts_money_check" CHECK (
    "subtotal_amount_minor" >= 0 AND "vat_amount_minor" >= 0
    AND "total_amount_minor" = "subtotal_amount_minor" + "vat_amount_minor"
  )
);

CREATE TABLE "stock_reservations" (
  "id" VARCHAR(36) NOT NULL,
  "checkout_id" VARCHAR(36) NOT NULL,
  "inventory_id" VARCHAR(36) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "released_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_reservations_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "orders" (
  "id" VARCHAR(36) NOT NULL,
  "public_number" VARCHAR(32) NOT NULL,
  "checkout_id" VARCHAR(36) NOT NULL,
  "buyer_organization_id" VARCHAR(36) NOT NULL,
  "supplier_organization_id" VARCHAR(36) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
  "subtotal_amount_minor" INTEGER NOT NULL,
  "vat_amount_minor" INTEGER NOT NULL,
  "total_amount_minor" INTEGER NOT NULL,
  "delivery_address_snapshot" JSONB NOT NULL,
  "invoice_address_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_money_check" CHECK (
    "subtotal_amount_minor" >= 0 AND "vat_amount_minor" >= 0
    AND "total_amount_minor" = "subtotal_amount_minor" + "vat_amount_minor"
  )
);

CREATE TABLE "order_items" (
  "id" VARCHAR(36) NOT NULL,
  "order_id" VARCHAR(36) NOT NULL,
  "source_product_id" VARCHAR(36) NOT NULL,
  "source_variant_id" VARCHAR(36) NOT NULL,
  "product_title_snapshot" VARCHAR(180) NOT NULL,
  "variant_title_snapshot" VARCHAR(160) NOT NULL,
  "sku_snapshot" VARCHAR(80) NOT NULL,
  "option_values_snapshot" JSONB NOT NULL,
  "image_snapshot" JSONB,
  "quantity" INTEGER NOT NULL,
  "unit_price_amount_minor" INTEGER NOT NULL,
  "subtotal_amount_minor" INTEGER NOT NULL,
  "vat_rate_basis_points" INTEGER NOT NULL,
  "vat_amount_minor" INTEGER NOT NULL,
  "total_amount_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_values_check" CHECK (
    "quantity" > 0 AND "unit_price_amount_minor" >= 0
    AND "subtotal_amount_minor" = "unit_price_amount_minor" * "quantity"
    AND "vat_rate_basis_points" BETWEEN 0 AND 10000
    AND "vat_amount_minor" >= 0
    AND "total_amount_minor" = "subtotal_amount_minor" + "vat_amount_minor"
  )
);

CREATE UNIQUE INDEX "carts_buyer_organization_id_key" ON "carts"("buyer_organization_id");
CREATE INDEX "carts_supplier_organization_id_idx" ON "carts"("supplier_organization_id");
CREATE UNIQUE INDEX "cart_items_cart_id_variant_id_key" ON "cart_items"("cart_id", "variant_id");
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items"("variant_id");
CREATE UNIQUE INDEX "checkouts_buyer_organization_id_idempotency_key_key" ON "checkouts"("buyer_organization_id", "idempotency_key");
CREATE INDEX "checkouts_buyer_organization_id_status_expires_at_idx" ON "checkouts"("buyer_organization_id", "status", "expires_at");
CREATE INDEX "checkouts_supplier_organization_id_created_at_idx" ON "checkouts"("supplier_organization_id", "created_at");
CREATE UNIQUE INDEX "stock_reservations_checkout_id_inventory_id_key" ON "stock_reservations"("checkout_id", "inventory_id");
CREATE INDEX "stock_reservations_status_expires_at_idx" ON "stock_reservations"("status", "expires_at");
CREATE INDEX "stock_reservations_inventory_id_status_idx" ON "stock_reservations"("inventory_id", "status");
CREATE UNIQUE INDEX "orders_public_number_key" ON "orders"("public_number");
CREATE UNIQUE INDEX "orders_checkout_id_key" ON "orders"("checkout_id");
CREATE INDEX "orders_buyer_organization_id_created_at_idx" ON "orders"("buyer_organization_id", "created_at");
CREATE INDEX "orders_supplier_organization_id_created_at_idx" ON "orders"("supplier_organization_id", "created_at");
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

ALTER TABLE "carts" ADD CONSTRAINT "carts_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_order_item_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'order_items are immutable snapshots';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_items_immutable
BEFORE UPDATE OR DELETE ON "order_items"
FOR EACH ROW EXECUTE FUNCTION prevent_order_item_mutation();

COMMIT;
