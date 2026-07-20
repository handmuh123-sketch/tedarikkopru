import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(3)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Yalnız küçük harf, rakam ve tire kullanın.");

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slug.max(120),
  parentId: optionalText(36),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "En az bir alan gereklidir.");

export const brandCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slug.max(120),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const brandUpdateSchema = brandCreateSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "En az bir alan gereklidir.");

const variantSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9._-]+$/),
  barcode: optionalText(32).refine(
    (value) => value === undefined || /^\d{8,14}$/.test(value),
    "Barkod 8-14 rakam olmalıdır.",
  ),
  title: z.string().trim().min(2).max(160),
  packageQuantity: z.number().int().min(1).max(100_000).default(1),
  moq: z.number().int().min(1).max(100_000),
  quantityStep: z.number().int().min(1).max(100_000),
  priceAmountMinor: z.number().int().min(1).max(2_000_000_000),
});

export const productWriteSchema = z.object({
  categoryId: z.string().trim().min(1).max(36),
  brandId: z.string().trim().min(1).max(36),
  title: z.string().trim().min(3).max(180),
  slug,
  shortDescription: z.string().trim().min(10).max(320),
  description: z.string().trim().min(20).max(10_000),
  originCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .default("TR"),
  vatRateBasisPoints: z.number().int().min(0).max(10_000).default(2_000),
  warrantyMonths: z.number().int().min(0).max(240).nullable().optional(),
  handlingDays: z.number().int().min(0).max(90).default(2),
  variant: variantSchema,
});

export const productModerationSchema = z
  .object({
    status: z.enum(["ACTIVE", "REJECTED"]),
    note: optionalText(1_000),
  })
  .superRefine((input, context) => {
    if (input.status === "REJECTED" && (!input.note || input.note.length < 5)) {
      context.addIssue({ code: "custom", path: ["note"], message: "Ret gerekçesi gereklidir." });
    }
  });
