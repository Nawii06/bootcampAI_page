import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  benefitApprovals,
  benefitCandidates,
  benefitEligibilityRules,
  benefitPayments,
  benefitPolicies,
} from "@workspace/db/schema";
import type {
  BenefitApprovalInput,
  BenefitCandidateInput,
  BenefitExpression,
  BenefitPaymentInput,
  BenefitPolicyInput,
  EligibilityExpression,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import {
  calculateBenefitAmount,
  evaluateEligibility,
} from "./calculator";
import { getPolicyWithRules } from "./repository";

export function createBenefitPolicy(
  input: BenefitPolicyInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const { rules, ...policyInput } = input;
    const [policy] = await tx
      .insert(benefitPolicies)
      .values({
        ...policyInput,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
        status: "DRAFT",
      })
      .returning();
    if (!policy) {
      throw new ApiError(500, "POLICY_CREATE_FAILED", "수혜정책을 생성하지 못했습니다.");
    }
    await tx.insert(benefitEligibilityRules).values(
      rules.map((rule) => ({
        ...rule,
        policyId: policy.id,
        sortOrder: String(rule.sortOrder),
      })),
    );
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "BENEFIT_POLICY",
      resourceId: policy.id,
      businessYearId: policy.businessYearId,
      requestId,
      after: input,
    });
    return policy;
  });
}

export function calculateBenefitCandidate(
  input: BenefitCandidateInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const context = await getPolicyWithRules(tx, input.policyId);
    if (!context || context.policy.status !== "OPEN") {
      throw new ApiError(404, "ACTIVE_POLICY_NOT_FOUND", "적용 가능한 수혜정책이 없습니다.");
    }
    const ruleResults = context.rules.map((rule) => ({
      code: rule.code,
      name: rule.name,
      expression: rule.expression,
      satisfied: evaluateEligibility(
        rule.expression as EligibilityExpression,
        input.facts,
      ),
    }));
    const eligible = ruleResults.every((result) => result.satisfied);
    const calculatedAmount = eligible
      ? calculateBenefitAmount(
          context.policy.amountFormula as BenefitExpression,
          input.facts,
        )
      : 0;
    const snapshot = {
      policy: {
        id: context.policy.id,
        code: context.policy.code,
        formula: context.policy.amountFormula,
      },
      facts: input.facts,
      ruleResults,
      eligible,
    };
    const [candidate] = await tx
      .insert(benefitCandidates)
      .values({
        policyId: input.policyId,
        studentId: input.studentId,
        eligibilitySnapshot: snapshot,
        calculatedAmount: String(calculatedAmount),
        status: eligible ? "REVIEWING" : "REJECTED",
      })
      .onConflictDoUpdate({
        target: [benefitCandidates.policyId, benefitCandidates.studentId],
        set: {
          eligibilitySnapshot: snapshot,
          calculatedAmount: String(calculatedAmount),
          status: eligible ? "REVIEWING" : "REJECTED",
          calculatedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CALCULATE",
      resourceType: "BENEFIT_CANDIDATE",
      resourceId: candidate?.id,
      businessYearId: context.policy.businessYearId,
      requestId,
      metadata: { eligible, calculatedAmount },
    });
    return candidate;
  });
}

export function approveBenefit(
  input: BenefitApprovalInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(benefitCandidates)
      .where(eq(benefitCandidates.id, input.candidateId))
      .for("update");
    if (!candidate) {
      throw new ApiError(404, "CANDIDATE_NOT_FOUND", "수혜 대상자를 찾을 수 없습니다.");
    }
    const [approval] = await tx
      .insert(benefitApprovals)
      .values({
        candidateId: input.candidateId,
        approvedAmount: String(input.approvedAmount),
        decision: input.decision,
        note: input.note,
        snapshot: {
          candidateCalculation: candidate.eligibilitySnapshot,
          calculatedAmount: candidate.calculatedAmount,
          approvedAmount: input.approvedAmount,
          decision: input.decision,
        },
        approvedBy: actorId,
      })
      .returning();
    await tx
      .update(benefitCandidates)
      .set({ status: input.decision === "APPROVED" ? "APPROVED" : "REJECTED" })
      .where(eq(benefitCandidates.id, input.candidateId));
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: input.decision,
      resourceType: "BENEFIT_APPROVAL",
      resourceId: approval?.id,
      requestId,
      metadata: { candidateId: input.candidateId, approvedAmount: input.approvedAmount },
    });
    return approval;
  });
}

export function updateBenefitPayment(
  input: BenefitPaymentInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(benefitPayments)
      .values({
        approvalId: input.approvalId,
        amount: String(input.amount),
        status: input.status,
        erpReference: input.erpReference,
        requestedAt: input.status === "REQUESTED" ? new Date() : undefined,
        paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
      })
      .onConflictDoUpdate({
        target: benefitPayments.approvalId,
        set: {
          amount: String(input.amount),
          status: input.status,
          erpReference: input.erpReference,
          paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "UPDATE_PAYMENT_STATUS",
      resourceType: "BENEFIT_PAYMENT",
      resourceId: payment?.id,
      requestId,
      metadata: {
        status: input.status,
        erpReference: input.erpReference,
      },
    });
    return payment;
  });
}
