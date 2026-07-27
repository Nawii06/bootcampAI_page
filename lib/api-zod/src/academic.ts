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

export const AcademicEntityIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CourseMasterUpdateSchema = CourseMasterInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one field is required.",
);

export const CourseOfferingInputSchema = z.object({
  courseMasterId: z.string().uuid(),
  businessYearId: z.string().uuid(),
  termId: z.string().uuid(),
  sectionCode: z.string().trim().min(1).max(30).default("01"),
  credits: z.coerce.number().min(0).max(99),
  capacity: z.number().int().positive().optional(),
  instructorName: z.string().trim().max(100).optional(),
  trackCodeId: z.string().uuid().optional(),
  programLevelCodeId: z.string().uuid().optional(),
  sourceSystem: z.string().trim().min(1).max(100).optional(),
  externalId: z.string().trim().min(1).max(200).optional(),
  isActive: z.boolean().default(true),
});

export const CourseOfferingUpdateSchema = CourseOfferingInputSchema.partial()
  .omit({ courseMasterId: true, businessYearId: true })
  .refine(
    (input) => Object.keys(input).length > 0,
    "At least one field is required.",
  );

export const CourseOfferingQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  courseMasterId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const CourseOfferingSchema = CourseOfferingInputSchema.extend({
  id: z.string().uuid(),
  courseCode: z.string(),
  courseName: z.string(),
  businessYearName: z.string(),
  termName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CurriculumFieldsSchema = z.object({
  businessYearId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  version: z.number().int().positive().default(1),
  trackCodeId: z.string().uuid().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  isPublished: z.boolean().default(false),
});

export const CurriculumInputSchema = CurriculumFieldsSchema
  .refine(
    (input) =>
      !input.effectiveTo ||
      new Date(input.effectiveTo) >= new Date(input.effectiveFrom),
    { message: "effectiveTo must not precede effectiveFrom", path: ["effectiveTo"] },
  );

export const CurriculumUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    trackCodeId: z.string().uuid().nullable().optional(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveTo: z.string().datetime().nullable().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "At least one field is required.");

export const CurriculumQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  isPublished: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const CurriculumSchema = CurriculumFieldsSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CurriculumRequirementFieldsSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  requirementType: z.enum([
    "TOTAL_CREDITS",
    "REQUIRED_COURSE",
    "TRACK_CREDITS",
    "EXTRACURRICULAR_HOURS",
    "PROJECT",
    "FIELD_PRACTICE",
    "INTERNSHIP",
  ]),
  operator: z.enum(["GTE", "LTE", "EQ", "IN"]).default("GTE"),
  requiredValue: z.coerce.number().nonnegative().optional(),
  unit: z.string().trim().max(30).optional(),
  courseMasterId: z.string().uuid().optional(),
  trackCodeId: z.string().uuid().optional(),
  conditions: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.number().int().nonnegative().default(0),
  isRequired: z.boolean().default(true),
});

function validateRequirementReferences(
  input: z.infer<typeof CurriculumRequirementFieldsSchema>,
  context: z.RefinementCtx,
) {
  if (input.requirementType === "REQUIRED_COURSE" && !input.courseMasterId) {
    context.addIssue({
      code: "custom",
      path: ["courseMasterId"],
      message: "Required-course requirements need courseMasterId.",
    });
  }
  if (input.requirementType === "TRACK_CREDITS" && !input.trackCodeId) {
    context.addIssue({
      code: "custom",
      path: ["trackCodeId"],
      message: "Track-credit requirements need trackCodeId.",
    });
  }
  if (
    input.requirementType !== "REQUIRED_COURSE" &&
    input.requiredValue === undefined
  ) {
    context.addIssue({
      code: "custom",
      path: ["requiredValue"],
      message: "Numeric requirements need requiredValue.",
    });
  }
}

export const CurriculumRequirementInputSchema =
  CurriculumRequirementFieldsSchema.superRefine(validateRequirementReferences);

export const CurriculumRequirementUpdateSchema =
  CurriculumRequirementFieldsSchema.partial().refine(
    (input) => Object.keys(input).length > 0,
    "At least one field is required.",
  );

export const CurriculumRequirementSchema =
  CurriculumRequirementFieldsSchema.extend({
    id: z.string().uuid(),
    curriculumId: z.string().uuid(),
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

export const CourseOfferingListResponseSchema = z.object({
  data: z.array(CourseOfferingSchema),
});

export const CurriculumListResponseSchema = z.object({
  data: z.array(CurriculumSchema),
});

export const CurriculumRequirementListResponseSchema = z.object({
  data: z.array(CurriculumRequirementSchema),
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
export type CourseMasterUpdate = z.infer<typeof CourseMasterUpdateSchema>;
export type CourseOfferingInput = z.infer<typeof CourseOfferingInputSchema>;
export type CourseOfferingUpdate = z.infer<typeof CourseOfferingUpdateSchema>;
export type CurriculumInput = z.infer<typeof CurriculumInputSchema>;
export type CurriculumUpdate = z.infer<typeof CurriculumUpdateSchema>;
export type CurriculumRequirementInput = z.infer<
  typeof CurriculumRequirementInputSchema
>;
export type CurriculumRequirementUpdate = z.infer<
  typeof CurriculumRequirementUpdateSchema
>;
export type ImportJobSummary = z.infer<typeof ImportJobSummarySchema>;
export type CourseImportRow = z.infer<typeof CourseImportRowSchema>;
export type StageCourseImport = z.infer<typeof StageCourseImportSchema>;
