import "server-only";

import { database } from "@/lib/db/client";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

import { resolvePublicProductImageUrl } from "./public-image-url";
import type { CanonicalMarketplaceProduct } from "../domain/types";

function toAttributes(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadFavoriteMarketplaceProducts(
  userId: string,
): Promise<CanonicalMarketplaceProduct[]> {
  const favorites = await database.productFavorite.findMany({
    where: {
      userId,
      product: {
        status: "ACTIVE",
        supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
        category: { isActive: true },
        brand: { status: "ACTIVE" },
        variants: { some: { status: "ACTIVE", inventory: { is: { onHand: { gt: 0 } } } } },
      },
    },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          supplierOrganization: { select: { id: true, tradeName: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          variants: {
            where: { status: "ACTIVE", inventory: { is: { onHand: { gt: 0 } } } },
            include: { inventory: true },
            orderBy: { sku: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.flatMap(({ product }) => {
    const variants = product.variants.flatMap((variant) => {
      if (!variant.inventory) return [];
      const stock = availableStock(
        variant.inventory.onHand,
        variant.inventory.safetyStock,
        variant.inventory.reserved,
      );
      if (stock <= 0) return [];
      return [
        {
          variantId: variant.id,
          sku: variant.sku,
          barcode: variant.barcode,
          title: variant.title,
          priceMinor: variant.priceAmountMinor,
          currency: variant.currency,
          availableStock: stock,
          moq: variant.moq,
          quantityStep: variant.quantityStep,
        },
      ];
    });
    if (variants.length === 0) return [];
    return [
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        category: {
          id: product.category.id,
          name: product.category.name,
          path: product.category.path,
        },
        brand: { id: product.brand.id, name: product.brand.name },
        supplier: {
          organizationId: product.supplierOrganization.id,
          tradeName: product.supplierOrganization.tradeName,
        },
        originCountry: product.originCountry,
        vatRateBasisPoints: product.vatRateBasisPoints,
        attributes: toAttributes(product.attributes),
        images: product.images
          .map((image) => resolvePublicProductImageUrl(image.storageKey))
          .filter((image): image is string => Boolean(image)),
        variants,
      },
    ];
  });
}
