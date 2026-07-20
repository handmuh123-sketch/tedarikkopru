import { z } from "zod";

export const organizationCreateSchema = z.object({
  type: z.enum(["SUPPLIER", "RESELLER", "BOTH"]),
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(120),
  taxNumber: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/),
  taxOffice: z.string().trim().min(2).max(120),
  mersisNumber: z.string().trim().max(32).optional(),
  kepAddress: z.string().trim().email().max(320).optional(),
  website: z.string().trim().url().max(2048).optional(),
  phone: z.string().trim().min(10).max(32),
  email: z.string().trim().email().max(320),
  sector: z.string().trim().max(120).optional(),
  authorizedPerson: z.string().trim().min(2).max(120),
});

export const organizationUpdateSchema = organizationCreateSchema
  .omit({ type: true, slug: true, taxNumber: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "En az bir alan gönderilmelidir.");

export const addressSchema = z.object({
  type: z.enum(["HEADQUARTERS", "BILLING", "WAREHOUSE", "RETURN"]),
  title: z.string().trim().min(2).max(100),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(32),
  countryCode: z.literal("TR").default("TR"),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(16).optional(),
  line1: z.string().trim().min(5).max(240),
  line2: z.string().trim().max(240).optional(),
  isDefault: z.boolean().default(false),
});

export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum([
    "ORG_ADMIN",
    "CATALOG_MANAGER",
    "ORDER_MANAGER",
    "FINANCE",
    "WAREHOUSE_OPERATOR",
    "VIEWER",
  ]),
});

export const membershipRoleSchema = z.object({
  role: z.enum([
    "OWNER",
    "ORG_ADMIN",
    "CATALOG_MANAGER",
    "ORDER_MANAGER",
    "FINANCE",
    "WAREHOUSE_OPERATOR",
    "VIEWER",
  ]),
});

export const verificationTransitionSchema = z
  .object({
    status: z.enum(["IN_REVIEW", "NEEDS_CHANGES", "APPROVED", "REJECTED", "SUSPENDED"]),
    reason: z.string().trim().min(5).max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (["NEEDS_CHANGES", "REJECTED", "SUSPENDED"].includes(value.status) && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Bu geçiş için gerekçe zorunludur.",
      });
    }
  });
