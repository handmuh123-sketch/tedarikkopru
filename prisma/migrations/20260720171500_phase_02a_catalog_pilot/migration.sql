BEGIN;

CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "ProductVariantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "categories" (
    "id" VARCHAR(36) NOT NULL,
    "parent_id" VARCHAR(36),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "attribute_schema" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brands" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "owner_organization_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" VARCHAR(36) NOT NULL,
    "supplier_organization_id" VARCHAR(36) NOT NULL,
    "category_id" VARCHAR(36) NOT NULL,
    "brand_id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "short_description" VARCHAR(320) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "origin_country" CHAR(2) NOT NULL DEFAULT 'TR',
    "vat_rate_basis_points" INTEGER NOT NULL DEFAULT 2000,
    "warranty_months" INTEGER,
    "handling_days" INTEGER NOT NULL DEFAULT 2,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "moderation_note" TEXT,
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_vat_check" CHECK ("vat_rate_basis_points" >= 0 AND "vat_rate_basis_points" <= 10000),
    CONSTRAINT "products_handling_check" CHECK ("handling_days" >= 0 AND "handling_days" <= 90),
    CONSTRAINT "products_warranty_check" CHECK ("warranty_months" IS NULL OR "warranty_months" >= 0)
);

CREATE TABLE "product_variants" (
    "id" VARCHAR(36) NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "supplier_organization_id" VARCHAR(36) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "barcode" VARCHAR(32),
    "title" VARCHAR(160) NOT NULL,
    "option_values" JSONB NOT NULL DEFAULT '{}',
    "package_quantity" INTEGER NOT NULL DEFAULT 1,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "quantity_step" INTEGER NOT NULL DEFAULT 1,
    "price_amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'TRY',
    "status" "ProductVariantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_commerce_check" CHECK (
        "package_quantity" > 0 AND "moq" > 0 AND "quantity_step" > 0 AND "price_amount_minor" > 0
    )
);

CREATE TABLE "product_images" (
    "id" VARCHAR(36) NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "variant_id" VARCHAR(36),
    "storage_key" VARCHAR(512) NOT NULL,
    "alt_text" VARCHAR(180) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_sort_order_check" CHECK ("sort_order" >= 0)
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "categories_path_key" ON "categories"("path");
CREATE INDEX "categories_parent_id_sort_order_idx" ON "categories"("parent_id", "sort_order");
CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");
CREATE INDEX "brands_status_name_idx" ON "brands"("status", "name");
CREATE INDEX "brands_owner_organization_id_idx" ON "brands"("owner_organization_id");

CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_id_supplier_organization_id_key" ON "products"("id", "supplier_organization_id");
CREATE INDEX "products_supplier_organization_id_status_updated_at_idx" ON "products"("supplier_organization_id", "status", "updated_at");
CREATE INDEX "products_status_published_at_idx" ON "products"("status", "published_at");
CREATE INDEX "products_category_id_status_idx" ON "products"("category_id", "status");
CREATE INDEX "products_brand_id_status_idx" ON "products"("brand_id", "status");

CREATE UNIQUE INDEX "product_variants_supplier_organization_id_sku_key" ON "product_variants"("supplier_organization_id", "sku");
CREATE INDEX "product_variants_product_id_status_idx" ON "product_variants"("product_id", "status");
CREATE INDEX "product_variants_barcode_idx" ON "product_variants"("barcode");

CREATE UNIQUE INDEX "product_images_storage_key_key" ON "product_images"("storage_key");
CREATE UNIQUE INDEX "product_images_one_primary_per_product_idx" ON "product_images"("product_id") WHERE "is_primary" = true;
CREATE INDEX "product_images_product_id_sort_order_idx" ON "product_images"("product_id", "sort_order");
CREATE INDEX "product_images_variant_id_idx" ON "product_images"("variant_id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brands" ADD CONSTRAINT "brands_owner_organization_id_fkey" FOREIGN KEY ("owner_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_supplier_organization_id_fkey" FOREIGN KEY ("product_id", "supplier_organization_id") REFERENCES "products"("id", "supplier_organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_supplier_organization_id_fkey" FOREIGN KEY ("supplier_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
