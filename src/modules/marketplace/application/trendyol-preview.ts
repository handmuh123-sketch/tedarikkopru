import "server-only";

import { database } from "@/lib/db/client";

import { marketplaceAdapter } from "../adapters/registry";
import type {
  CanonicalMarketplaceProduct,
  MarketplaceMappedProduct,
  MarketplaceProductMapping,
} from "../domain/types";
import { loadFavoriteMarketplaceProducts } from "./favorite-product-loader";

type MappingRows = {
  categories: Map<
    string,
    { externalCategoryId: string; attributes: MarketplaceProductMapping["attributes"] }
  >;
  brands: Map<string, string>;
};

async function loadMappings(products: CanonicalMarketplaceProduct[]): Promise<MappingRows> {
  const categoryIds = [...new Set(products.map((product) => product.category.id))];
  const brandIds = [...new Set(products.map((product) => product.brand.id))];
  const [categories, brands] = await Promise.all([
    database.marketplaceCategoryMapping.findMany({
      where: { channel: "TRENDYOL", isActive: true, categoryId: { in: categoryIds } },
      include: { attributeMappings: { where: { isActive: true } } },
    }),
    database.marketplaceBrandMapping.findMany({
      where: { channel: "TRENDYOL", isActive: true, brandId: { in: brandIds } },
    }),
  ]);
  return {
    categories: new Map(
      categories.map((category) => [
        category.categoryId,
        {
          externalCategoryId: category.externalCategoryId,
          attributes: category.attributeMappings.map((attribute) => ({
            sourceAttributeKey: attribute.sourceAttributeKey,
            externalAttributeId: attribute.externalAttributeId,
            externalValueId: attribute.externalValueId,
          })),
        },
      ]),
    ),
    brands: new Map(brands.map((brand) => [brand.brandId, brand.externalBrandId])),
  };
}

export type TrendyolPreview = {
  channel: "TRENDYOL";
  mode: "preview";
  generatedAt: string;
  products: Array<{
    productId: string;
    variantId: string;
    payload: Record<string, unknown> | null;
    validation: MarketplaceMappedProduct["validation"];
  }>;
  validation: {
    validCount: number;
    invalidCount: number;
    warnings: number;
    errors: number;
  };
};

export async function buildTrendyolPreview(userId: string): Promise<TrendyolPreview> {
  const products = await loadFavoriteMarketplaceProducts(userId);
  const mappings = await loadMappings(products);
  const adapter = marketplaceAdapter("TRENDYOL");
  const mapped = products.flatMap((product) =>
    adapter.mapProduct(product, {
      externalCategoryId: mappings.categories.get(product.category.id)?.externalCategoryId ?? null,
      externalBrandId: mappings.brands.get(product.brand.id) ?? null,
      attributes: mappings.categories.get(product.category.id)?.attributes ?? [],
    }),
  );
  return {
    channel: "TRENDYOL",
    mode: "preview",
    generatedAt: new Date().toISOString(),
    products: mapped,
    validation: {
      validCount: mapped.filter((item) => item.validation.valid).length,
      invalidCount: mapped.filter((item) => !item.validation.valid).length,
      warnings: mapped.reduce((total, item) => total + item.validation.warnings.length, 0),
      errors: mapped.reduce((total, item) => total + item.validation.errors.length, 0),
    },
  };
}
