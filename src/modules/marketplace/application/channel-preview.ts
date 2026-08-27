import "server-only";

import { database } from "@/lib/db/client";

import { marketplaceAdapter } from "../adapters/registry";
import type {
  CanonicalMarketplaceProduct,
  MarketplaceChannel,
  MarketplaceMappedProduct,
  MarketplaceProductMapping,
} from "../domain/types";
import { loadFavoriteMarketplaceProducts } from "./favorite-product-loader";

type MappingRows = {
  categories: Map<
    string,
    { externalCategoryId: string; attributes: MarketplaceProductMapping["attributes"] }
  >;
  brands: Map<string, { externalBrandId: string }>;
};

async function loadMappings(
  channel: MarketplaceChannel,
  products: CanonicalMarketplaceProduct[],
): Promise<MappingRows> {
  const categoryIds = [...new Set(products.map((product) => product.category.id))];
  const brandIds = [...new Set(products.map((product) => product.brand.id))];
  const [categories, brands] = await Promise.all([
    database.marketplaceCategoryMapping.findMany({
      where: { channel, isActive: true, categoryId: { in: categoryIds } },
      include: { attributeMappings: { where: { isActive: true } } },
    }),
    database.marketplaceBrandMapping.findMany({
      where: { channel, isActive: true, brandId: { in: brandIds } },
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
    brands: new Map(
      brands.map((brand) => [brand.brandId, { externalBrandId: brand.externalBrandId }]),
    ),
  };
}

export type MarketplaceChannelPreview = {
  channel: MarketplaceChannel;
  mode: "preview";
  generatedAt: string;
  products: Array<{
    productId: string;
    variantId: string;
    payload: Record<string, unknown> | null;
    validation: MarketplaceMappedProduct["validation"];
    display: {
      title: string;
      sku: string;
      barcode: string | null;
      availableStock: number;
      priceMinor: number;
      image: string | null;
    };
  }>;
  validation: {
    validCount: number;
    invalidCount: number;
    warnings: number;
    errors: number;
  };
};

export async function buildMarketplaceChannelPreview(
  userId: string,
  channel: MarketplaceChannel,
): Promise<MarketplaceChannelPreview> {
  const products = await loadFavoriteMarketplaceProducts(userId);
  const mappings = await loadMappings(channel, products);
  const adapter = marketplaceAdapter(channel);
  const mapped = products.flatMap((product) => {
    const category = mappings.categories.get(product.category.id);
    const brand = mappings.brands.get(product.brand.id);
    return adapter
      .mapProduct(product, {
        externalCategoryId: category?.externalCategoryId ?? null,
        externalBrandId: brand?.externalBrandId ?? null,
        attributes: category?.attributes ?? [],
      })
      .map((item) => {
        const variant = product.variants.find(
          (candidate) => candidate.variantId === item.variantId,
        );
        return {
          ...item,
          display: {
            title: product.title,
            sku: variant?.sku ?? "-",
            barcode: variant?.barcode ?? null,
            availableStock: variant?.availableStock ?? 0,
            priceMinor: variant?.priceMinor ?? 0,
            image: product.images[0] ?? null,
          },
        };
      });
  });
  return {
    channel,
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
