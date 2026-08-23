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
    {
      externalCategoryId: string;
      metadataSource: "MANUAL" | "MOCK" | "LIVE";
      attributes: Array<
        MarketplaceProductMapping["attributes"][number] & {
          metadataSource: "MANUAL" | "MOCK" | "LIVE";
        }
      >;
    }
  >;
  brands: Map<string, { externalBrandId: string; metadataSource: "MANUAL" | "MOCK" | "LIVE" }>;
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
          metadataSource: category.metadataSource,
          attributes: category.attributeMappings.map((attribute) => ({
            sourceAttributeKey: attribute.sourceAttributeKey,
            externalAttributeId: attribute.externalAttributeId,
            externalValueId: attribute.externalValueId,
            metadataSource: attribute.metadataSource,
          })),
        },
      ]),
    ),
    brands: new Map(
      brands.map((brand) => [
        brand.brandId,
        { externalBrandId: brand.externalBrandId, metadataSource: brand.metadataSource },
      ]),
    ),
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
    display: {
      title: string;
      sku: string;
      barcode: string | null;
      availableStock: number;
      priceMinor: number;
      image: string | null;
    };
    mappingSources: {
      category: "MANUAL" | "MOCK" | "LIVE" | null;
      brand: "MANUAL" | "MOCK" | "LIVE" | null;
      attributes: Array<"MANUAL" | "MOCK" | "LIVE">;
    };
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
          mappingSources: {
            category: category?.metadataSource ?? null,
            brand: brand?.metadataSource ?? null,
            attributes: (category?.attributes ?? []).map((attribute) => attribute.metadataSource),
          },
        };
      });
  });
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
