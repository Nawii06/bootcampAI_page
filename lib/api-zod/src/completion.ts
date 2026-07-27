import { z } from "zod";

export const CompletionRequirementSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    "TOTAL_CREDITS",
    "REQUIRED_COURSE",
    "TRACK_CREDITS",
    "EXTRACURRICULAR_HOURS",
    "PROJECT",
    "FIELD_PRACTICE",
    "INTERNSHIP",
  ]),
  operator: z.enum(["GTE", "LTE", "EQ", "IN"]).optional(),
  requiredValue: z.number().nonnegative().optional(),
  courseId: z.string().optional(),
  trackCode: z.string().optional(),
});

export const CompletionInputsSchema = z.object({
  totalCredits: z.number().nonnegative(),
  completedCourseIds: z.array(z.string()),
  trackCredits: z.record(z.string(), z.number().nonnegative()),
  extracurricularHours: z.number().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  fieldPracticeCount: z.number().int().nonnegative(),
  internshipCount: z.number().int().nonnegative(),
});

export const CompletionCalculationRequestSchema = z.object({
  businessYearId: z.string().uuid(),
  studentId: z.string().uuid(),
  curriculumId: z.string().uuid(),
  programSessionId: z.string().uuid().optional(),
  calculationVersion: z.string().trim().min(1).max(50),
  requirements: z.array(CompletionRequirementSchema),
  inputs: CompletionInputsSchema,
});

export const DerivedCompletionCalculationRequestSchema = z.object({
  businessYearId: z.string().uuid(),
  studentId: z.string().uuid(),
  curriculumId: z.string().uuid(),
  calculationVersion: z.string().trim().min(1).max(50).default("db-derived-v1"),
});

export const CompletionAssessmentQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  businessYearId: z.string().uuid().optional(),
});

export const ExperientialRecordQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  businessYearId: z.string().uuid().optional(),
  type: z
    .enum(["PROJECT", "FIELD_PRACTICE", "INTERNSHIP", "OTHER"])
    .optional(),
});

export const ExperientialRecordInputSchema = z.object({
  businessYearId: z.string().uuid(),
  type: z.enum(["PROJECT", "FIELD_PRACTICE", "INTERNSHIP", "OTHER"]),
  title: z.string().trim().min(1).max(200),
  organizationName: z.string().trim().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  hours: z.number().nonnegative().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "VERIFIED", "COMPLETED"]),
  evidence: z.object({
    summary: z.string().trim().min(1).max(4000),
    techStack: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    outputLinks: z.array(z.string().url()).max(20).default([]),
    publicConsent: z.boolean().default(false),
  }),
});

export const CompletionResultItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  required: z.union([z.number(), z.string(), z.boolean()]),
  actual: z.union([z.number(), z.string(), z.boolean()]),
  shortage: z.number(),
}).passthrough();

export const CompletionAssessmentResponseSchema = z.object({
  id: z.string().uuid(),
  businessYearId: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  studentNumber: z.string().optional(),
  studentName: z.string().optional(),
  curriculumId: z.string().uuid().optional(),
  curriculumName: z.string().optional(),
  calculationVersion: z.string().optional(),
  completed: z.boolean(),
  progressRate: z.union([z.string(), z.number()]),
  satisfied: z.array(CompletionResultItemSchema),
  missing: z.array(CompletionResultItemSchema),
  eligiblePrograms: z.array(z.unknown()).optional().default([]),
  calculatedAt: z.string(),
}).passthrough();

export const CompletionAssessmentListResponseSchema = z.object({
  data: z.array(CompletionAssessmentResponseSchema),
});

export const ExperientialRecordResponseSchema = z.object({
  id: z.string().uuid(),
  businessYearId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  type: z.enum(["PROJECT", "FIELD_PRACTICE", "INTERNSHIP", "OTHER"]).optional(),
  title: z.string(),
  status: z.string(),
  evidence: z.object({
    summary: z.string(),
    techStack: z.array(z.string()).default([]),
    outputLinks: z.array(z.string()).default([]),
    publicConsent: z.boolean().default(false),
  }),
  createdAt: z.string(),
}).passthrough();

export const ExperientialRecordListResponseSchema = z.object({
  data: z.array(ExperientialRecordResponseSchema),
});

export type CompletionRequirement = z.infer<
  typeof CompletionRequirementSchema
>;
export type CompletionInputs = z.infer<typeof CompletionInputsSchema>;
export type CompletionAssessmentResponse = z.infer<
  typeof CompletionAssessmentResponseSchema
>;
export type ExperientialRecordResponse = z.infer<
  typeof ExperientialRecordResponseSchema
>;
