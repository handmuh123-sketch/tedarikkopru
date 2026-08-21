BEGIN;

ALTER TABLE "cart_items"
  ADD COLUMN "quote_id" VARCHAR(36),
  ADD COLUMN "quoted_unit_price_minor" INTEGER;

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cart_items_quoted_price_check"
  CHECK (
    ("quote_id" IS NULL AND "quoted_unit_price_minor" IS NULL)
    OR ("quote_id" IS NOT NULL AND "quoted_unit_price_minor" IS NOT NULL AND "quoted_unit_price_minor" >= 0)
  );

CREATE INDEX "cart_items_quote_id_idx" ON "cart_items"("quote_id");

COMMIT;
