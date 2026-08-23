CREATE TYPE "MarketplaceChannel" AS ENUM ('TRENDYOL', 'HEPSIBURADA', 'AMAZON_TR');
CREATE TYPE "MarketplaceConnectionStatus" AS ENUM ('DISCONNECTED', 'DRAFT', 'CONNECTED', 'DEGRADED', 'ERROR', 'DISABLED');
CREATE TYPE "MarketplaceSyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'PREVIEW');
CREATE TYPE "MarketplaceSyncJobType" AS ENUM ('PRODUCT_PUBLISH', 'PRICE_INVENTORY_UPDATE', 'WEBHOOK_REPLAY');
CREATE TYPE "MarketplaceSyncItemStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'PREVIEW');
CREATE TYPE "MarketplaceWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'REJECTED', 'FAILED');

CREATE TABLE "marketplace_connections" (
  "id" VARCHAR(36) NOT NULL,
  "organization_id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "status" "MarketplaceConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "display_name" VARCHAR(120) NOT NULL,
  "credential_ciphertext" TEXT,
  "credential_fingerprint" VARCHAR(64),
  "safe_metadata" JSONB NOT NULL DEFAULT '{}',
  "last_health_check_at" TIMESTAMPTZ(3),
  "last_success_at" TIMESTAMPTZ(3),
  "last_error_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_sync_jobs" (
  "id" VARCHAR(36) NOT NULL,
  "connection_id" VARCHAR(36) NOT NULL,
  "organization_id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "type" "MarketplaceSyncJobType" NOT NULL,
  "status" "MarketplaceSyncJobStatus" NOT NULL DEFAULT 'PENDING',
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "item_count" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "failure_count" INTEGER NOT NULL DEFAULT 0,
  "provider_request_id" VARCHAR(160),
  "safe_error_summary" VARCHAR(500),
  "started_at" TIMESTAMPTZ(3),
  "finished_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_sync_items" (
  "id" VARCHAR(36) NOT NULL,
  "job_id" VARCHAR(36) NOT NULL,
  "product_id" VARCHAR(36) NOT NULL,
  "variant_id" VARCHAR(36),
  "status" "MarketplaceSyncItemStatus" NOT NULL DEFAULT 'PENDING',
  "external_id" VARCHAR(160),
  "safe_error_code" VARCHAR(80),
  "safe_error_message" VARCHAR(500),
  "payload_snapshot" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_sync_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_inbox" (
  "id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "connection_id" VARCHAR(36),
  "organization_id" VARCHAR(36),
  "dedup_key" VARCHAR(64) NOT NULL,
  "signature_valid" BOOLEAN NOT NULL,
  "status" "MarketplaceWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "safe_payload" JSONB NOT NULL,
  "safe_error_code" VARCHAR(80),
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_inbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_category_mappings" (
  "id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "category_id" VARCHAR(36) NOT NULL,
  "external_category_id" VARCHAR(80) NOT NULL,
  "external_category_name" VARCHAR(200) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_category_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_brand_mappings" (
  "id" VARCHAR(36) NOT NULL,
  "channel" "MarketplaceChannel" NOT NULL,
  "brand_id" VARCHAR(36) NOT NULL,
  "external_brand_id" VARCHAR(80) NOT NULL,
  "external_brand_name" VARCHAR(200) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_brand_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_attribute_mappings" (
  "id" VARCHAR(36) NOT NULL,
  "category_mapping_id" VARCHAR(36) NOT NULL,
  "source_attribute_key" VARCHAR(120) NOT NULL,
  "external_attribute_id" VARCHAR(80) NOT NULL,
  "external_attribute_name" VARCHAR(200) NOT NULL,
  "external_value_id" VARCHAR(80),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketplace_attribute_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketplace_connections_organization_id_channel_key" ON "marketplace_connections"("organization_id", "channel");
CREATE INDEX "marketplace_connections_channel_status_updated_at_idx" ON "marketplace_connections"("channel", "status", "updated_at");
CREATE UNIQUE INDEX "marketplace_sync_jobs_organization_id_connection_id_idempotency_key_key" ON "marketplace_sync_jobs"("organization_id", "connection_id", "idempotency_key");
CREATE INDEX "marketplace_sync_jobs_organization_id_channel_created_at_idx" ON "marketplace_sync_jobs"("organization_id", "channel", "created_at");
CREATE INDEX "marketplace_sync_jobs_connection_id_status_created_at_idx" ON "marketplace_sync_jobs"("connection_id", "status", "created_at");
CREATE INDEX "marketplace_sync_items_job_id_status_idx" ON "marketplace_sync_items"("job_id", "status");
CREATE INDEX "marketplace_sync_items_product_id_created_at_idx" ON "marketplace_sync_items"("product_id", "created_at");
CREATE UNIQUE INDEX "webhook_inbox_channel_dedup_key_key" ON "webhook_inbox"("channel", "dedup_key");
CREATE INDEX "webhook_inbox_connection_id_received_at_idx" ON "webhook_inbox"("connection_id", "received_at");
CREATE INDEX "webhook_inbox_status_received_at_idx" ON "webhook_inbox"("status", "received_at");
CREATE UNIQUE INDEX "marketplace_category_mappings_channel_category_id_key" ON "marketplace_category_mappings"("channel", "category_id");
CREATE INDEX "marketplace_category_mappings_channel_is_active_idx" ON "marketplace_category_mappings"("channel", "is_active");
CREATE UNIQUE INDEX "marketplace_brand_mappings_channel_brand_id_key" ON "marketplace_brand_mappings"("channel", "brand_id");
CREATE INDEX "marketplace_brand_mappings_channel_is_active_idx" ON "marketplace_brand_mappings"("channel", "is_active");
CREATE UNIQUE INDEX "marketplace_attribute_mappings_category_mapping_id_source_attribute_key_key" ON "marketplace_attribute_mappings"("category_mapping_id", "source_attribute_key");
CREATE INDEX "marketplace_attribute_mappings_category_mapping_id_is_active_idx" ON "marketplace_attribute_mappings"("category_mapping_id", "is_active");

ALTER TABLE "marketplace_connections" ADD CONSTRAINT "marketplace_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_sync_jobs" ADD CONSTRAINT "marketplace_sync_jobs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "marketplace_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_sync_jobs" ADD CONSTRAINT "marketplace_sync_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_sync_items" ADD CONSTRAINT "marketplace_sync_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "marketplace_sync_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_sync_items" ADD CONSTRAINT "marketplace_sync_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_sync_items" ADD CONSTRAINT "marketplace_sync_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "webhook_inbox" ADD CONSTRAINT "webhook_inbox_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "marketplace_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_inbox" ADD CONSTRAINT "webhook_inbox_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketplace_category_mappings" ADD CONSTRAINT "marketplace_category_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_brand_mappings" ADD CONSTRAINT "marketplace_brand_mappings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_attribute_mappings" ADD CONSTRAINT "marketplace_attribute_mappings_category_mapping_id_fkey" FOREIGN KEY ("category_mapping_id") REFERENCES "marketplace_category_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
