import { z } from "zod";

export const CourseMasterInputSchema = z.object({
  courseCode: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  englishName: z.string().trim().max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  defaultCredits: z.coerce.number().min(0).max(99),
  departmentCode: z.string().trim().max(50).optional(),
  sourceSystem: z.string().trim().min(1).max(100).optional(),
  externalId: z.string().trim().min(1).max(200).optional(),
});

export const CourseMasterSchema = CourseMasterInputSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CourseListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const CourseListResponseSchema = z.object({
  data: z.array(CourseMasterSchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export const CourseImportRowSchema = CourseMasterInputSchema.extend({
  sourceSystem: z.string().trim().min(1).max(100),
  externalId: z.string().trim().min(1).max(200),
});

export const StageCourseImportSchema = z.object({
  businessYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  sourceSystem: z.string().trim().min(1).max(100),
  sourceType: z.enum(["JSON", "CSV", "XLSX", "API"]),
  fileName: z.string().trim().max(255).optional(),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  rows: z.array(z.unknown()).min(1).max(10_000),
});

export const CourseImportUploadMetadataSchema = z.object({
  businessYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  sourceSystem: z.string().trim().min(1).max(100),
});

export const ExternalCourseImportSchema = z.object({
  businessYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  sourceSystem: z.string().trim().min(1).max(100),
  url: z.string().url(),
});

export const ImportJobSummarySchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "UPLOADED",
    "STAGED",
    "VALIDATED",
    "PREVIEWED",
    "COMMITTED",
    "FAILED",
    "CANCELLED",
  ]),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  insertRows: z.number().int().nonnegative(),
  updateRows: z.number().int().nonnegative(),
  unchangedRows: z.number().int().nonnegative(),
});

export const ImportJobIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CourseMasterInput = z.infer<typeof CourseMasterInputSchema>;
export type CourseImportRow = z.infer<typeof CourseImportRowSchema>;
export type StageCourseImport = z.infer<typeof StageCourseImportSchema>;
