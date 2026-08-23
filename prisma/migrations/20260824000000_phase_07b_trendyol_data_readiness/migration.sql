CREATE TYPE "MarketplaceMetadataSource" AS ENUM ('MANUAL', 'MOCK', 'LIVE');

ALTER TABLE "marketplace_category_mappings"
ADD COLUMN "metadata_source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "marketplace_brand_mappings"
ADD COLUMN "metadata_source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "marketplace_attribute_mappings"
ADD COLUMN "metadata_source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL';

CREATE TABLE "marketplace_external_categories" (
  "id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "external_id" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "parent_external_id" VARCHAR(80),
  "is_leaf" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL',
  "safe_metadata" JSONB,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_external_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketplace_external_categories_channel_external_id_key" UNIQUE ("channel", "external_id")
);

CREATE TABLE "marketplace_external_brands" (
  "id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "external_id" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL',
  "safe_metadata" JSONB,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_external_brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_external_attributes" (
  "id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "external_category_id" VARCHAR(80) NOT NULL,
  "external_attribute_id" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "allow_custom" BOOLEAN NOT NULL DEFAULT false,
  "is_variant" BOOLEAN NOT NULL DEFAULT false,
  "allows_multiple" BOOLEAN NOT NULL DEFAULT false,
  "source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL',
  "safe_metadata" JSONB,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_external_attributes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketplace_external_attributes_category_fkey" FOREIGN KEY ("channel", "external_category_id") REFERENCES "marketplace_external_categories"("channel", "external_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "marketplace_external_attribute_values" (
  "id" VARCHAR(36) NOT NULL,
  "attribute_id" VARCHAR(36) NOT NULL,
  "external_id" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "source" "MarketplaceMetadataSource" NOT NULL DEFAULT 'MANUAL',
  "safe_metadata" JSONB,
  "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_external_attribute_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketplace_external_attribute_values_attribute_fkey" FOREIGN KEY ("attribute_id") REFERENCES "marketplace_external_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "marketplace_external_categories_channel_is_active_name_idx" ON "marketplace_external_categories"("channel", "is_active", "name");
CREATE UNIQUE INDEX "marketplace_external_brands_channel_external_id_key" ON "marketplace_external_brands"("channel", "external_id");
CREATE INDEX "marketplace_external_brands_channel_is_active_name_idx" ON "marketplace_external_brands"("channel", "is_active", "name");
CREATE UNIQUE INDEX "marketplace_external_attributes_channel_external_category_id_external_attribute_id_key" ON "marketplace_external_attributes"("channel", "external_category_id", "external_attribute_id");
CREATE INDEX "marketplace_external_attributes_channel_external_category_id_is_required_idx" ON "marketplace_external_attributes"("channel", "external_category_id", "is_required");
CREATE UNIQUE INDEX "marketplace_external_attribute_values_attribute_id_external_id_key" ON "marketplace_external_attribute_values"("attribute_id", "external_id");
CREATE INDEX "marketplace_external_attribute_values_attribute_id_is_active_idx" ON "marketplace_external_attribute_values"("attribute_id", "is_active");
