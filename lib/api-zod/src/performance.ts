import { z } from "zod";

export const PerformanceIndicatorInputSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(30),
  calculationFormula: z.record(z.string(), z.unknown()),
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
