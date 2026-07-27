import { z } from "zod";

export const BenefitExpressionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("FIXED"),
    amount: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("MULTIPLY"),
    fact: z.string().min(1),
    rate: z.number().nonnegative(),
    maximumAmount: z.number().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("TIERED"),
    fact: z.string().min(1),
    tiers: z
      .array(
        z.object({
          minimum: z.number(),
          amount: z.number().nonnegative(),
        }),
      )
      .min(1),
  }),
]);

export const EligibilityExpressionSchema = z.object({
  fact: z.string().min(1),
  operator: z.enum(["GTE", "LTE", "EQ", "IN"]),
  value: z.union([z.number(), z.string(), z.array(z.string())]),
});

export const BenefitPolicyInputSchema = z.object({
  businessYearId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  benefitType: z.string().trim().min(1).max(50),
  amountFormula: BenefitExpressionSchema,
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  rules: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(200),
        expression: EligibilityExpressionSchema,
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1),
}).superRefine((value, context) => {
  if (
    value.effectiveTo &&
    new Date(value.effectiveTo) <= new Date(value.effectiveFrom)
  ) {
    context.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "종료일시는 시작일시 이후여야 합니다.",
    });
  }
});

export const BenefitCandidateInputSchema = z.object({
  policyId: z.string().uuid(),
  studentId: z.string().uuid(),
  facts: z.record(z.string(), z.union([z.number(), z.string(), z.array(z.string())])),
});

export const BenefitApprovalInputSchema = z.object({
  candidateId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  approvedAmount: z.number().nonnegative(),
  note: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if (value.decision === "REJECTED" && value.approvedAmount !== 0) {
    context.addIssue({
      code: "custom",
      path: ["approvedAmount"],
      message: "반려 결정의 승인액은 0이어야 합니다.",
    });
  }
});

export const BenefitBulkCalculationInputSchema = z.object({
  policyId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  dryRun: z.boolean().default(true),
});

const BenefitBulkCalculationResultSchema = z.object({
  studentId: z.string().uuid(),
  eligible: z.boolean(),
  calculatedAmount: z.number().nonnegative(),
  skippedReason: z.enum(["DECIDED"]).nullable(),
  facts: z.record(
    z.string(),
    z.union([z.number(), z.string(), z.array(z.string())]),
  ),
  ruleResults: z.array(z.object({
    code: z.string(),
    satisfied: z.boolean(),
  })),
});

export const BenefitBulkCalculationResponseSchema = z.object({
  policyId: z.string().uuid(),
  dryRun: z.boolean(),
  evaluated: z.number().int().nonnegative(),
  eligible: z.number().int().nonnegative(),
  ineligible: z.number().int().nonnegative(),
  committed: z.number().int().nonnegative(),
  skippedDecided: z.number().int().nonnegative(),
  calculationVersion: z.string(),
  calculatedAt: z.string().datetime(),
  results: z.array(BenefitBulkCalculationResultSchema),
});

export const BenefitPolicyStatusInputSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]),
  reason: z.string().trim().min(5).max(1000),
});

export const BenefitPolicyIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const BenefitPaymentInputSchema = z.object({
  approvalId: z.string().uuid(),
  amount: z.number().nonnegative(),
  status: z.enum(["PENDING", "REQUESTED", "PAID", "FAILED", "CANCELLED"]),
  erpReference: z.string().trim().max(200).optional(),
  paidAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  if (value.status === "PAID" && !value.erpReference) {
    context.addIssue({
      code: "custom",
      path: ["erpReference"],
      message: "지급완료에는 ERP 참조번호가 필요합니다.",
    });
  }
  if (value.status === "PAID" && !value.paidAt) {
    context.addIssue({
      code: "custom",
      path: ["paidAt"],
      message: "지급완료에는 지급일시가 필요합니다.",
    });
  }
});

export const BenefitOperationsQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
});

const BenefitPolicyResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "ARCHIVED"]),
}).passthrough();

const BenefitCandidateResponseSchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  studentId: z.string().uuid(),
  calculatedAmount: z.union([z.string(), z.number()]),
  status: z.string(),
}).passthrough();

const BenefitApprovalResponseSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  approvedAmount: z.union([z.string(), z.number()]),
  decision: z.string(),
}).passthrough();

const BenefitPaymentResponseSchema = z.object({
  id: z.string().uuid(),
  approvalId: z.string().uuid(),
  amount: z.union([z.string(), z.number()]),
  status: z.string(),
  erpReference: z.string().nullable().optional(),
}).passthrough();

const BenefitStudentResponseSchema = z.object({
  id: z.string().uuid(),
  studentNumber: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  departmentCode: z.string().nullable().optional(),
}).passthrough();

export const BenefitOperationsResponseSchema = z.object({
  policies: z.array(BenefitPolicyResponseSchema),
  candidates: z.array(BenefitCandidateResponseSchema),
  approvals: z.array(BenefitApprovalResponseSchema),
  payments: z.array(BenefitPaymentResponseSchema),
  students: z.array(BenefitStudentResponseSchema),
});

export type BenefitExpression = z.infer<typeof BenefitExpressionSchema>;
export type EligibilityExpression = z.infer<typeof EligibilityExpressionSchema>;
export type BenefitPolicyInput = z.infer<typeof BenefitPolicyInputSchema>;
export type BenefitPolicyStatusInput = z.infer<
  typeof BenefitPolicyStatusInputSchema
>;
export type BenefitCandidateInput = z.infer<typeof BenefitCandidateInputSchema>;
export type BenefitBulkCalculationInput = z.infer<
  typeof BenefitBulkCalculationInputSchema
>;
export type BenefitBulkCalculationResponse = z.infer<
  typeof BenefitBulkCalculationResponseSchema
>;
export type BenefitApprovalInput = z.infer<typeof BenefitApprovalInputSchema>;
export type BenefitPaymentInput = z.infer<typeof BenefitPaymentInputSchema>;
export type BenefitOperationsResponse = z.infer<
  typeof BenefitOperationsResponseSchema
>;
