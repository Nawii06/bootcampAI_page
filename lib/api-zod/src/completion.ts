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

export type CompletionRequirement = z.infer<
  typeof CompletionRequirementSchema
>;
export type CompletionInputs = z.infer<typeof CompletionInputsSchema>;
