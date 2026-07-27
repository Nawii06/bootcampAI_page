import { z } from "zod";

export const PerformanceSourceKeySchema = z.enum([
  "STUDENTS",
  "COMPANIES",
  "PROGRAMS",
  "COMPANY_PARTICIPATIONS",
  "EXPERIENTIAL_RECORDS",
  "COURSE_COMPLETIONS",
  "PROGRAM_APPLICATIONS",
]);

export const PerformanceCalculationFormulaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("COUNT"), source: PerformanceSourceKeySchema }),
  z.object({
    type: z.literal("RATE"),
    numerator: PerformanceSourceKeySchema,
    denominator: PerformanceSourceKeySchema,
    multiplier: z.number().positive().default(100),
    precision: z.number().int().min(0).max(4).default(2),
  }),
]);

export const PerformanceIndicatorInputSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(30),
  calculationFormula: PerformanceCalculationFormulaSchema,
  description: z.string().trim().max(4000).optional(),
});

export const PerformanceTargetInputSchema = z.object({
  indicatorId: z.string().uuid(),
  businessYearId: z.string().uuid(),
  targetValue: z.number(),
  version: z.string().trim().min(1).max(50),
  rationale: z.string().trim().max(2000).optional(),
});

export const PerformanceResultInputSchema = z.object({
  indicatorId: z.string().uuid(),
  businessYearId: z.string().uuid(),
  actualValue: z.number(),
  calculationSnapshot: z.record(z.string(), z.unknown()),
});

export const PerformanceResultIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const PerformanceEvidenceInputSchema = z.object({
  resultId: z.string().uuid(),
  fileId: z.string().uuid(),
  description: z.string().trim().max(2000).optional(),
});

export const PerformanceOverviewQuerySchema = z.object({
  businessYearId: z.string().uuid(),
});

export const PerformanceReviewInputSchema = z.object({
  businessYearId: z.string().uuid(),
  question: z.string().trim().min(1).max(1000),
  answerSummary: z.string().trim().min(1).max(8000),
  limitations: z.string().trim().max(4000).optional(),
  improvementPlan: z.string().trim().min(1).max(4000),
  linkedIndicatorIds: z.array(z.string().uuid()).max(100).default([]),
  linkedEvidenceIds: z.array(z.string().uuid()).max(100).default([]),
});

export const PerformanceReviewQuerySchema = z.object({
  businessYearId: z.string().uuid(),
});

export const PerformanceSourceSummaryQuerySchema = z.object({
  businessYearId: z.string().uuid(),
});

const PerformanceIndicatorResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
}).passthrough();

const PerformanceResultResponseSchema = z.object({
  id: z.string().uuid(),
  indicatorId: z.string().uuid(),
  actualValue: z.union([z.string(), z.number()]),
  status: z.string(),
  updatedAt: z.string(),
}).passthrough();

const PerformanceEvidenceResponseSchema = z.object({
  id: z.string().uuid(),
  resultId: z.string().uuid(),
  fileId: z.string().uuid(),
}).passthrough();

export const PerformanceOverviewResponseSchema = z.object({
  indicators: z.array(PerformanceIndicatorResponseSchema),
  targets: z.array(z.object({
    id: z.string().uuid(),
    indicatorId: z.string().uuid(),
    targetValue: z.union([z.string(), z.number()]),
    version: z.string().optional(),
  }).passthrough()),
  results: z.array(PerformanceResultResponseSchema),
  evidence: z.array(PerformanceEvidenceResponseSchema),
});

export const PublicPerformanceResultResponseSchema = z.object({
  id: z.string().uuid(),
  indicatorCode: z.string(),
  indicatorName: z.string(),
  actualValue: z.union([z.string(), z.number()]),
  unit: z.string(),
  publishedAt: z.string().nullable().optional(),
}).passthrough();

export const PublicPerformanceResultListResponseSchema = z.object({
  data: z.array(PublicPerformanceResultResponseSchema),
});

export const PerformanceReviewResponseSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  answerSummary: z.string(),
  limitations: z.string().nullable().optional(),
  improvementPlan: z.string(),
  status: z.string(),
  createdAt: z.string(),
}).passthrough();

export const PerformanceReviewListResponseSchema = z.object({
  data: z.array(PerformanceReviewResponseSchema),
});

export const PerformanceSourceRowSchema = z.object({
  id: z.string(),
  domain: z.string(),
  table: z.string(),
  count: z.number().int().nonnegative(),
  yearScoped: z.boolean(),
});

export const PerformanceSourceSummaryResponseSchema = z.object({
  data: z.array(PerformanceSourceRowSchema),
});

export const PerformanceCalculationInputSchema = z.object({
  indicatorId: z.string().uuid(),
  businessYearId: z.string().uuid(),
  dryRun: z.boolean().default(true),
});

export const PerformanceCalculationResponseSchema = z.object({
  indicatorId: z.string().uuid(),
  businessYearId: z.string().uuid(),
  dryRun: z.boolean(),
  actualValue: z.number(),
  formula: PerformanceCalculationFormulaSchema,
  sources: z.record(z.string(), z.number().nonnegative()),
  calculationVersion: z.string(),
  calculatedAt: z.string().datetime(),
  resultId: z.string().uuid().nullable(),
});

export type PerformanceCalculationFormula = z.infer<
  typeof PerformanceCalculationFormulaSchema
>;
export type PerformanceCalculationResponse = z.infer<
  typeof PerformanceCalculationResponseSchema
>;

export type PerformanceSourceRow = z.infer<typeof PerformanceSourceRowSchema>;

export type PerformanceOverviewResponse = z.infer<
  typeof PerformanceOverviewResponseSchema
>;
