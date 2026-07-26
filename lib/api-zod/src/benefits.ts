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
});

export const BenefitPaymentInputSchema = z.object({
  approvalId: z.string().uuid(),
  amount: z.number().nonnegative(),
  status: z.enum(["PENDING", "REQUESTED", "PAID", "FAILED", "CANCELLED"]),
  erpReference: z.string().trim().max(200).optional(),
  paidAt: z.string().datetime().optional(),
});

export type BenefitExpression = z.infer<typeof BenefitExpressionSchema>;
export type EligibilityExpression = z.infer<typeof EligibilityExpressionSchema>;
export type BenefitPolicyInput = z.infer<typeof BenefitPolicyInputSchema>;
export type BenefitCandidateInput = z.infer<typeof BenefitCandidateInputSchema>;
export type BenefitApprovalInput = z.infer<typeof BenefitApprovalInputSchema>;
export type BenefitPaymentInput = z.infer<typeof BenefitPaymentInputSchema>;
