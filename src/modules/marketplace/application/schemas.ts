import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const marketplaceChannelSchema = z.enum(["TRENDYOL", "HEPSIBURADA", "AMAZON_TR"]);

export const marketplaceCredentialsSchema = z.object({
  sellerId: optionalText,
  apiKey: optionalText,
  apiSecret: optionalText,
  environment: z.enum(["STAGE", "PRODUCTION"]).optional(),
  shipmentAddressId: z.coerce.number().int().positive().optional(),
  returningAddressId: z.coerce.number().int().positive().optional(),
  webhookApiKey: optionalText,
});

export const marketplaceConnectionCreateSchema = z.object({
  channel: marketplaceChannelSchema,
  displayName: z.string().trim().min(2).max(120).optional(),
  credentials: marketplaceCredentialsSchema.optional(),
});

export const marketplaceConnectionUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  credentials: marketplaceCredentialsSchema.optional(),
});

export const marketplaceMappingSchema = z.object({
  channel: marketplaceChannelSchema,
  sourceId: z.string().trim().min(1).max(36),
  externalId: z.string().trim().min(1).max(80),
  externalName: z.string().trim().min(1).max(200),
  isActive: z.boolean().optional(),
});

export const marketplaceAttributeMappingSchema = z.object({
  categoryMappingId: z.string().trim().min(1).max(36),
  sourceAttributeKey: z.string().trim().min(1).max(120),
  externalAttributeId: z.string().trim().min(1).max(80),
  externalAttributeName: z.string().trim().min(1).max(200),
  externalValueId: optionalText,
  isActive: z.boolean().optional(),
});

const metadataSourceSchema = z.enum(["MANUAL", "MOCK"]);

export const trendyolMetadataSyncSchema = z.object({
  source: metadataSourceSchema.default("MANUAL"),
  categories: z
    .array(
      z.object({
        externalId: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(200),
        parentExternalId: optionalText,
        isLeaf: z.boolean().default(false),
        isActive: z.boolean().default(true),
      }),
    )
    .max(500)
    .optional(),
  brands: z
    .array(
      z.object({
        externalId: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(200),
        isActive: z.boolean().default(true),
      }),
    )
    .max(500)
    .optional(),
  attributes: z
    .array(
      z.object({
        externalCategoryId: z.string().trim().min(1).max(80),
        externalId: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(200),
        isRequired: z.boolean().default(false),
        allowCustom: z.boolean().default(false),
        isVariant: z.boolean().default(false),
        allowsMultiple: z.boolean().default(false),
        values: z
          .array(
            z.object({
              externalId: z.string().trim().min(1).max(80),
              name: z.string().trim().min(1).max(200),
              isActive: z.boolean().default(true),
            }),
          )
          .max(1000)
          .optional(),
      }),
    )
    .max(1000)
    .optional(),
});
