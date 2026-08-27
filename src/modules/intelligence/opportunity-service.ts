import "server-only";

import { database } from "@/lib/db/client";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

import { calculateProductOpportunity } from "./opportunity-score";

export async function findProductOpportunities(limit = 24) {
  const products = await database.product.findMany({
    where: {
      status: "ACTIVE",
      supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
      variants: { some: { status: "ACTIVE", inventory: { is: { onHand: { gt: 0 } } } } },
    },
    include: {
      supplierOrganization: true,
      category: {
        include: {
          marketplaceCategoryMappings: {
            where: { isActive: true },
            select: { channel: true },
          },
        },
      },
      brand: {
        include: {
          marketplaceBrandMappings: {
            where: { isActive: true },
            select: { channel: true },
          },
        },
      },
      variants: {
        where: { status: "ACTIVE" },
        include: { inventory: true },
        orderBy: { createdAt: "asc" },
      },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 120,
  });

  return products
    .flatMap((product) => {
      const variant = product.variants.find(
        (candidate) =>
          candidate.inventory &&
          availableStock(
            candidate.inventory.onHand,
            candidate.inventory.safetyStock,
            candidate.inventory.reserved,
          ) > 0,
      );
      if (!variant?.inventory) return [];
      const stock = availableStock(
        variant.inventory.onHand,
        variant.inventory.safetyStock,
        variant.inventory.reserved,
      );
      const opportunity = calculateProductOpportunity({
        priceAmountMinor: variant.priceAmountMinor,
        moq: variant.moq,
        availableStock: stock,
        handlingDays: product.handlingDays,
        hasImage: product.images.length > 0,
        hasBarcode: Boolean(variant.barcode),
        verifiedSupplier: product.supplierOrganization.verificationStatus === "APPROVED",
        warrantyMonths: product.warrantyMonths,
        categoryChannels: product.category.marketplaceCategoryMappings.map((mapping) => mapping.channel),
        brandChannels: product.brand.marketplaceBrandMappings.map((mapping) => mapping.channel),
      });
      return [
        {
          id: product.id,
          slug: product.slug,
          title: product.title,
          shortDescription: product.shortDescription,
          brandName: product.brand.name,
          categoryName: product.category.name,
          supplierName: product.supplierOrganization.tradeName,
          handlingDays: product.handlingDays,
          image: product.images[0] ?? null,
          variant: {
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode,
            priceAmountMinor: variant.priceAmountMinor,
            moq: variant.moq,
            quantityStep: variant.quantityStep,
            availableStock: stock,
          },
          opportunity,
        },
      ];
    })
    .sort((a, b) => {
      if (b.opportunity.score !== a.opportunity.score) return b.opportunity.score - a.opportunity.score;
      if (b.opportunity.readyChannelCount !== a.opportunity.readyChannelCount)
        return b.opportunity.readyChannelCount - a.opportunity.readyChannelCount;
      return b.variant.availableStock - a.variant.availableStock;
    })
    .slice(0, Math.max(1, Math.min(limit, 60)));
}
