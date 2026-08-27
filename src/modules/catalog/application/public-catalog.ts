import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

export type CatalogSort = "newest" | "price-asc" | "price-desc" | "title";

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
  return value === "price-asc" || value === "price-desc" || value === "title" ? value : "newest";
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

export async function findPublicProducts(filters: CatalogFilters = {}) {
  const candidates = await database.product.findMany({
    where: publicCatalogWhere(filters),
    include: {
      category: true,
      brand: true,
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
    .map((product) => ({
      ...product,
      variants: product.variants.filter(
        (variant) =>
          variant.inventory &&
          availableStock(
            variant.inventory.onHand,
            variant.inventory.safetyStock,
            variant.inventory.reserved,
          ) > 0,
      ),
    }))
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
  }

  return products.slice(0, 48);
}

export async function findPublicProductBySlug(slug: string) {
  const product = await database.product.findFirst({
    where: { slug, ...publicCatalogWhere() },
    include: {
      category: true,
      brand: true,
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
  return availableVariants.length > 0 ? { ...product, variants: availableVariants } : null;
}
