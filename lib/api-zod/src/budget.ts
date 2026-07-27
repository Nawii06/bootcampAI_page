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
}).refine((value) => value.plannedAmount <= value.allocatedAmount, {
  path: ["plannedAmount"],
  message: "편성액은 배정액을 초과할 수 없습니다.",
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

export const BudgetOperationsQuerySchema = BudgetSummaryQuerySchema;

export const BudgetSummaryResponseSchema = z.object({
  allocated: z.number(),
  planned: z.number(),
  executed: z.number(),
  balance: z.number(),
  executionRate: z.number(),
});

export const BudgetAllocationResponseSchema = z.object({
  id: z.string().uuid(),
  businessYearId: z.string().uuid(),
  programId: z.string().uuid().nullable().optional(),
  programName: z.string().nullable().optional(),
  budgetCode: z.string(),
  category: z.string(),
  allocatedAmount: z.union([z.string(), z.number()]),
  plannedAmount: z.union([z.string(), z.number()]),
  internalApprovalNumber: z.string().nullable().optional(),
  erpReference: z.string().nullable().optional(),
  rcmsReference: z.string().nullable().optional(),
}).passthrough();

export const BudgetExecutionResponseSchema = z.object({
  id: z.string().uuid(),
  allocationId: z.string().uuid(),
  amount: z.union([z.string(), z.number()]),
  purpose: z.string(),
  evidenceFileId: z.string().uuid().nullable().optional(),
}).passthrough();

export const BudgetOperationsResponseSchema = z.object({
  allocations: z.array(BudgetAllocationResponseSchema),
  executions: z.array(BudgetExecutionResponseSchema),
});

export const BudgetChangeHistoryQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  allocationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const BudgetChangeHistoryItemSchema = z.object({
  id: z.string().uuid(),
  allocationId: z.string().uuid().optional(),
  budgetCode: z.string(),
  category: z.string(),
  fieldName: z.string(),
  previousAmount: z.union([z.string(), z.number()]).nullable(),
  newAmount: z.union([z.string(), z.number()]),
  reason: z.string(),
  changedByName: z.string(),
  changedAt: z.string(),
}).passthrough();

export const BudgetChangeHistoryResponseSchema = z.object({
  data: z.array(BudgetChangeHistoryItemSchema),
});

export type BudgetAllocationInput = z.infer<typeof BudgetAllocationInputSchema>;
export type BudgetExecutionInput = z.infer<typeof BudgetExecutionInputSchema>;
export type BudgetAmountChange = z.infer<typeof BudgetAmountChangeSchema>;
export type BudgetChangeHistoryItem = z.infer<
  typeof BudgetChangeHistoryItemSchema
>;
