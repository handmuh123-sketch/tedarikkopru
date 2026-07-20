BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "InventoryMovementType" AS ENUM ('ADJUSTMENT', 'IMPORT');
CREATE TYPE "ImportJobType" AS ENUM ('PRODUCT_CATALOG');
CREATE TYPE "ImportJobStatus" AS ENUM ('PREVIEW_READY', 'APPLIED', 'FAILED');

CREATE UNIQUE INDEX "product_variants_id_supplier_organization_id_key"
ON "product_variants"("id", "supplier_organization_id");

CREATE TABLE "inventories" (
    "id" VARCHAR(36) NOT NULL,
    "variant_id" VARCHAR(36) NOT NULL,
    "supplier_organization_id" VARCHAR(36) NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "safety_stock" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventories_nonnegative_check" CHECK (
        "on_hand" >= 0 AND "safety_stock" >= 0 AND "version" >= 0
    )
);

CREATE TABLE "inventory_movements" (
    "id" VARCHAR(36) NOT NULL,
    "inventory_id" VARCHAR(36) NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "safety_stock_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(60),
    "reference_id" VARCHAR(80),
    "reason" VARCHAR(240) NOT NULL,
    "actor_user_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_balance_check" CHECK (
        "balance_after" >= 0 AND "safety_stock_after" >= 0 AND char_length(btrim("reason")) >= 3
    )
);

CREATE TABLE "product_favorites" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_jobs" (
    "id" VARCHAR(36) NOT NULL,
    "organization_id" VARCHAR(36) NOT NULL,
    "type" "ImportJobType" NOT NULL DEFAULT 'PRODUCT_CATALOG',
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PREVIEW_READY',
    "file_name" VARCHAR(180) NOT NULL,
    "file_type" VARCHAR(10) NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "valid_rows" INTEGER NOT NULL,
    "invalid_rows" INTEGER NOT NULL,
    "preview_rows" JSONB NOT NULL,
    "row_errors" JSONB NOT NULL,
    "created_by_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "import_jobs_counts_check" CHECK (
        "total_rows" >= 0 AND "valid_rows" >= 0 AND "invalid_rows" >= 0
        AND "valid_rows" + "invalid_rows" = "total_rows"
    )
);

CREATE UNIQUE INDEX "inventories_variant_id_key" ON "inventories"("variant_id");
CREATE UNIQUE INDEX "inventories_variant_id_supplier_organization_id_key" ON "inventories"("variant_id", "supplier_organization_id");
CREATE INDEX "inventories_supplier_organization_id_updated_at_idx" ON "inventories"("supplier_organization_id", "updated_at");
CREATE INDEX "inventories_on_hand_safety_stock_idx" ON "inventories"("on_hand", "safety_stock");
CREATE INDEX "inventory_movements_inventory_id_created_at_idx" ON "inventory_movements"("inventory_id", "created_at");
CREATE INDEX "inventory_movements_actor_user_id_created_at_idx" ON "inventory_movements"("actor_user_id", "created_at");
CREATE UNIQUE INDEX "product_favorites_user_id_product_id_key" ON "product_favorites"("user_id", "product_id");
CREATE INDEX "product_favorites_product_id_idx" ON "product_favorites"("product_id");
CREATE UNIQUE INDEX "import_jobs_organization_id_content_hash_key" ON "import_jobs"("organization_id", "content_hash");
CREATE INDEX "import_jobs_organization_id_created_at_idx" ON "import_jobs"("organization_id", "created_at");
CREATE INDEX "import_jobs_status_created_at_idx" ON "import_jobs"("status", "created_at");
CREATE INDEX "products_title_trgm_idx" ON "products" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "products_short_description_trgm_idx" ON "products" USING GIN ("short_description" gin_trgm_ops);

ALTER TABLE "inventories" ADD CONSTRAINT "inventories_variant_id_supplier_organization_id_fkey"
FOREIGN KEY ("variant_id", "supplier_organization_id")
REFERENCES "product_variants"("id", "supplier_organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_supplier_organization_id_fkey"
FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_id_fkey"
FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_favorites" ADD CONSTRAINT "product_favorites_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_favorites" ADD CONSTRAINT "product_favorites_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_inventory_movement_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'inventory_movements are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movements_append_only
BEFORE UPDATE OR DELETE ON "inventory_movements"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

COMMIT;
