import { z } from "zod";

export const BudgetAllocationInputSchema = z.object({
  businessYearId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  budgetCode: z.string().trim().min(1).max(50),
  category: z.string().trim().min(1).max(100),
  allocatedAmount: z.number().nonnegative(),
  plannedAmount: z.number().nonnegative(),
  internalApprovalNumber: z.string().trim().max(100).optional(),
  erpReference: z.string().trim().max(200).optional(),
  rcmsReference: z.string().trim().max(200).optional(),
});

export const BudgetExecutionInputSchema = z.object({
  allocationId: z.string().uuid(),
  amount: z.number().positive(),
  purpose: z.string().trim().min(1).max(2000),
  executedAt: z.string().datetime(),
  evidenceFileId: z.string().uuid().optional(),
  internalApprovalNumber: z.string().trim().max(100).optional(),
  erpReference: z.string().trim().max(200).optional(),
  rcmsReference: z.string().trim().max(200).optional(),
});

export const BudgetAmountChangeSchema = z.object({
  allocationId: z.string().uuid(),
  field: z.enum(["allocatedAmount", "plannedAmount"]),
  newAmount: z.number().nonnegative(),
  reason: z.string().trim().min(1).max(2000),
});

export const BudgetSummaryQuerySchema = z.object({
  businessYearId: z.string().uuid(),
  programId: z.string().uuid().optional(),
});

export const BudgetChangeHistoryQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  allocationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type BudgetAllocationInput = z.infer<typeof BudgetAllocationInputSchema>;
export type BudgetExecutionInput = z.infer<typeof BudgetExecutionInputSchema>;
export type BudgetAmountChange = z.infer<typeof BudgetAmountChangeSchema>;
