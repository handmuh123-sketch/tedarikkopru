import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";
import { calculateProductOpportunity } from "@/modules/intelligence/opportunity-score";

export type CatalogSort = "newest" | "price-asc" | "price-desc" | "title" | "opportunity";

export type CatalogFilters = {
  query?: string | undefined;
  category?: string | undefined;
  brand?: string | undefined;
  minPriceMinor?: number | undefined;
  maxPriceMinor?: number | undefined;
  sort?: CatalogSort | undefined;
};

export function parseTryFilterMinor(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replaceAll(" ", "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const [whole = "0", fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result >= 0 ? result : undefined;
}

export function parseCatalogSort(value: string | undefined): CatalogSort {
  return value === "price-asc" ||
    value === "price-desc" ||
    value === "title" ||
    value === "opportunity"
    ? value
    : "newest";
}

export function publicCatalogWhere(filters: CatalogFilters = {}): Prisma.ProductWhereInput {
  const variantWhere: Prisma.ProductVariantWhereInput = {
    status: "ACTIVE",
    inventory: { is: { onHand: { gt: 0 } } },
  };
  if (filters.minPriceMinor !== undefined)
    variantWhere.priceAmountMinor = { gte: filters.minPriceMinor };
  if (filters.maxPriceMinor !== undefined) {
    variantWhere.priceAmountMinor = {
      ...(typeof variantWhere.priceAmountMinor === "object" ? variantWhere.priceAmountMinor : {}),
      lte: filters.maxPriceMinor,
    };
  }
  return {
    status: "ACTIVE",
    supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
    category: filters.category ? { slug: filters.category, isActive: true } : { isActive: true },
    brand: filters.brand ? { slug: filters.brand, status: "ACTIVE" } : { status: "ACTIVE" },
    variants: { some: variantWhere },
    ...(filters.query
      ? {
          OR: [
            { title: { contains: filters.query, mode: "insensitive" } },
            { shortDescription: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
            { variants: { some: { sku: { contains: filters.query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

function opportunityForProduct(product: {
  handlingDays: number;
  warrantyMonths: number | null;
  supplierOrganization: { verificationStatus: string };
  category: { marketplaceCategoryMappings: Array<{ channel: string }> };
  brand: { marketplaceBrandMappings: Array<{ channel: string }> };
  images: Array<unknown>;
  variants: Array<{
    barcode: string | null;
    moq: number;
    priceAmountMinor: number;
    inventory: { onHand: number; safetyStock: number; reserved: number } | null;
  }>;
}) {
  const variant = product.variants[0];
  if (!variant?.inventory) return null;
  return calculateProductOpportunity({
    priceAmountMinor: variant.priceAmountMinor,
    moq: variant.moq,
    availableStock: availableStock(
      variant.inventory.onHand,
      variant.inventory.safetyStock,
      variant.inventory.reserved,
    ),
    handlingDays: product.handlingDays,
    hasImage: product.images.length > 0,
    hasBarcode: Boolean(variant.barcode),
    verifiedSupplier: product.supplierOrganization.verificationStatus === "APPROVED",
    warrantyMonths: product.warrantyMonths,
    categoryChannels: product.category.marketplaceCategoryMappings.map(
      (mapping) => mapping.channel,
    ),
    brandChannels: product.brand.marketplaceBrandMappings.map((mapping) => mapping.channel),
  });
}

export async function findPublicProducts(filters: CatalogFilters = {}) {
  const candidates = await database.product.findMany({
    where: publicCatalogWhere(filters),
    include: {
      category: {
        include: {
          marketplaceCategoryMappings: { where: { isActive: true }, select: { channel: true } },
        },
      },
      brand: {
        include: {
          marketplaceBrandMappings: { where: { isActive: true }, select: { channel: true } },
        },
      },
      supplierOrganization: true,
      variants: {
        where: {
          status: "ACTIVE",
          ...(filters.minPriceMinor !== undefined || filters.maxPriceMinor !== undefined
            ? {
                priceAmountMinor: {
                  ...(filters.minPriceMinor !== undefined ? { gte: filters.minPriceMinor } : {}),
                  ...(filters.maxPriceMinor !== undefined ? { lte: filters.maxPriceMinor } : {}),
                },
              }
            : {}),
        },
        include: { inventory: true },
        orderBy: { createdAt: "asc" },
      },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 100,
  });

  const products = candidates
    .map((product) => {
      const variants = product.variants.filter(
        (variant) =>
          variant.inventory &&
          availableStock(
            variant.inventory.onHand,
            variant.inventory.safetyStock,
            variant.inventory.reserved,
          ) > 0,
      );
      const item = { ...product, variants };
      return { ...item, opportunity: opportunityForProduct(item) };
    })
    .filter((product) => product.variants.length > 0);

  const sort = filters.sort ?? "newest";
  if (sort === "title") {
    products.sort((a, b) => a.title.localeCompare(b.title, "tr"));
  } else if (sort === "price-asc" || sort === "price-desc") {
    products.sort((a, b) => {
      const priceA = Math.min(...a.variants.map((variant) => variant.priceAmountMinor));
      const priceB = Math.min(...b.variants.map((variant) => variant.priceAmountMinor));
      return sort === "price-asc" ? priceA - priceB : priceB - priceA;
    });
  } else if (sort === "opportunity") {
    products.sort((a, b) => (b.opportunity?.score ?? 0) - (a.opportunity?.score ?? 0));
  }

  return products.slice(0, 48);
}

export async function findPublicProductBySlug(slug: string) {
  const product = await database.product.findFirst({
    where: { slug, ...publicCatalogWhere() },
    include: {
      category: {
        include: {
          marketplaceCategoryMappings: { where: { isActive: true }, select: { channel: true } },
        },
      },
      brand: {
        include: {
          marketplaceBrandMappings: { where: { isActive: true }, select: { channel: true } },
        },
      },
      supplierOrganization: true,
      variants: {
        where: { status: "ACTIVE", inventory: { is: { onHand: { gt: 0 } } } },
        include: { inventory: true },
        orderBy: { createdAt: "asc" },
      },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
    },
  });
  if (!product) return null;
  const availableVariants = product.variants.filter(
    (variant) =>
      variant.inventory &&
      availableStock(
        variant.inventory.onHand,
        variant.inventory.safetyStock,
        variant.inventory.reserved,
      ) > 0,
  );
  if (availableVariants.length === 0) return null;
  const item = { ...product, variants: availableVariants };
  return { ...item, opportunity: opportunityForProduct(item) };
}
