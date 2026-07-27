import { z } from "zod";

export const roleCodes = [
  "PUBLIC",
  "STUDENT",
  "COMPANY_APPLICANT",
  "COMPANY_MANAGER",
  "EDUCATION_STAFF",
  "BENEFIT_STAFF",
  "COMPANY_STAFF",
  "BUDGET_STAFF",
  "PERFORMANCE_STAFF",
  "CONTENT_EDITOR",
  "REVIEWER",
  "SYSTEM_ADMIN",
  "AUDITOR",
] as const;

export const RoleCodeSchema = z.enum(roleCodes);
export type RoleCode = z.infer<typeof RoleCodeSchema>;

export const ApiFieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    fieldErrors: z.array(ApiFieldErrorSchema).optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const BusinessYearReferenceSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int().optional(),
  name: z.string(),
}).passthrough();

export const BusinessYearListResponseSchema = z.object({
  data: z.array(BusinessYearReferenceSchema),
});

export const TermReferenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
}).passthrough();

export const TermListResponseSchema = z.object({
  data: z.array(TermReferenceSchema),
});

export const SystemStatusResponseSchema = z.object({
  database: z.string(),
  environment: z.string(),
  mockAuthEnabled: z.boolean(),
  ssoConfigured: z.boolean(),
  externalImportAllowlistConfigured: z.boolean(),
  fileStorageConfigured: z.boolean(),
  malwareScanningConfigured: z.boolean(),
});

export function DataResponseSchema<Item extends z.ZodTypeAny>(item: Item) {
  return z.object({ data: z.array(item) });
}

export function PaginatedResponseSchema<Item extends z.ZodTypeAny>(item: Item) {
  return z.object({
    data: z.array(item),
    meta: PaginationMetaSchema,
  });
}
