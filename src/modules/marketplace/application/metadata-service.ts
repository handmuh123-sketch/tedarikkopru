import "server-only";

import type { MarketplaceMetadataSource, Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";

import type {
  TrendyolExternalAttribute,
  TrendyolExternalBrand,
  TrendyolExternalCategory,
} from "./trendyol-metadata-client";

type MetadataAudit = {
  actorId: string;
  requestId: string;
  network?: string;
};

type TrendyolExternalCategoryInput = Omit<TrendyolExternalCategory, "parentExternalId"> & {
  parentExternalId?: string | null | undefined;
};

export type TrendyolMetadataSyncInput = {
  source: MarketplaceMetadataSource;
  categories?: TrendyolExternalCategoryInput[] | undefined;
  brands?: TrendyolExternalBrand[] | undefined;
  attributes?: Array<TrendyolExternalAttribute & { externalCategoryId: string }> | undefined;
};

function safeMetadata(value: Record<string, boolean>): Prisma.InputJsonValue {
  return value;
}

export async function syncTrendyolMetadata(input: TrendyolMetadataSyncInput) {
  const fetchedAt = new Date();
  return database.$transaction(async (transaction) => {
    let categories = 0;
    let brands = 0;
    let attributes = 0;
    for (const category of input.categories ?? []) {
      await transaction.marketplaceExternalCategory.upsert({
        where: { channel_externalId: { channel: "TRENDYOL", externalId: category.externalId } },
        update: {
          name: category.name,
          parentExternalId: category.parentExternalId ?? null,
          isLeaf: category.isLeaf,
          isActive: category.isActive,
          source: input.source,
          safeMetadata: safeMetadata({ isLeaf: category.isLeaf }),
          fetchedAt,
        },
        create: {
          channel: "TRENDYOL",
          externalId: category.externalId,
          name: category.name,
          parentExternalId: category.parentExternalId ?? null,
          isLeaf: category.isLeaf,
          isActive: category.isActive,
          source: input.source,
          safeMetadata: safeMetadata({ isLeaf: category.isLeaf }),
          fetchedAt,
        },
      });
      categories += 1;
    }
    for (const brand of input.brands ?? []) {
      await transaction.marketplaceExternalBrand.upsert({
        where: { channel_externalId: { channel: "TRENDYOL", externalId: brand.externalId } },
        update: {
          name: brand.name,
          isActive: brand.isActive,
          source: input.source,
          fetchedAt,
        },
        create: {
          channel: "TRENDYOL",
          externalId: brand.externalId,
          name: brand.name,
          isActive: brand.isActive,
          source: input.source,
          fetchedAt,
        },
      });
      brands += 1;
    }
    for (const attribute of input.attributes ?? []) {
      const category = await transaction.marketplaceExternalCategory.findUnique({
        where: {
          channel_externalId: {
            channel: "TRENDYOL",
            externalId: attribute.externalCategoryId,
          },
        },
        select: { id: true },
      });
      if (!category) continue;
      const storedAttribute = await transaction.marketplaceExternalAttribute.upsert({
        where: {
          channel_externalCategoryId_externalAttributeId: {
            channel: "TRENDYOL",
            externalCategoryId: attribute.externalCategoryId,
            externalAttributeId: attribute.externalId,
          },
        },
        update: {
          name: attribute.name,
          isRequired: attribute.isRequired,
          allowCustom: attribute.allowCustom,
          isVariant: attribute.isVariant,
          allowsMultiple: attribute.allowsMultiple,
          source: input.source,
          safeMetadata: safeMetadata({
            required: attribute.isRequired,
            allowCustom: attribute.allowCustom,
          }),
          fetchedAt,
        },
        create: {
          channel: "TRENDYOL",
          externalCategoryId: attribute.externalCategoryId,
          externalAttributeId: attribute.externalId,
          name: attribute.name,
          isRequired: attribute.isRequired,
          allowCustom: attribute.allowCustom,
          isVariant: attribute.isVariant,
          allowsMultiple: attribute.allowsMultiple,
          source: input.source,
          safeMetadata: safeMetadata({
            required: attribute.isRequired,
            allowCustom: attribute.allowCustom,
          }),
          fetchedAt,
        },
        select: { id: true },
      });
      for (const value of attribute.values ?? []) {
        await transaction.marketplaceExternalAttributeValue.upsert({
          where: {
            attributeId_externalId: {
              attributeId: storedAttribute.id,
              externalId: value.externalId,
            },
          },
          update: {
            name: value.name,
            isActive: value.isActive,
            source: input.source,
            fetchedAt,
          },
          create: {
            attributeId: storedAttribute.id,
            externalId: value.externalId,
            name: value.name,
            isActive: value.isActive,
            source: input.source,
            fetchedAt,
          },
        });
      }
      attributes += 1;
    }
    return { categories, brands, attributes };
  });
}

export async function listTrendyolMetadata(query = "") {
  const search = query.trim();
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};
  const [categories, brands] = await Promise.all([
    database.marketplaceExternalCategory.findMany({
      where: { channel: "TRENDYOL", ...where },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 100,
    }),
    database.marketplaceExternalBrand.findMany({
      where: { channel: "TRENDYOL", ...where },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 100,
    }),
  ]);
  const attributes = await database.marketplaceExternalAttribute.findMany({
    where: {
      channel: "TRENDYOL",
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { values: { where: { isActive: true }, orderBy: { name: "asc" }, take: 100 } },
    orderBy: [{ isRequired: "desc" }, { name: "asc" }],
    take: 200,
  });
  return { categories, brands, attributes };
}

export async function recordTrendyolMetadataSync(
  input: {
    result: { categories: number; brands: number; attributes: number };
    source: MarketplaceMetadataSource;
  },
  audit: MetadataAudit,
) {
  await database.auditLog.create({
    data: {
      actorType: "USER",
      actorId: audit.actorId,
      action: "marketplace.trendyol_metadata_synced",
      targetType: "MarketplaceMetadata",
      targetId: "TRENDYOL",
      afterRedacted: { source: input.source, ...input.result },
      requestId: audit.requestId,
    },
  });
}
