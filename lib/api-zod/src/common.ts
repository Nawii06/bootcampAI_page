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
