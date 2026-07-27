import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  benefitApprovals,
  benefitCandidates,
  benefitEligibilityRules,
  benefitPayments,
  benefitPolicies,
  students,
} from "@workspace/db/schema";
import type {
  BenefitApprovalInput,
  BenefitBulkCalculationInput,
  BenefitCandidateInput,
  BenefitExpression,
  BenefitPaymentInput,
  BenefitPolicyInput,
  BenefitPolicyStatusInput,
  EligibilityExpression,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import {
  calculateBenefitAmount,
  evaluateEligibility,
} from "./calculator";
import {
  getPolicyWithRules,
  loadBenefitStudentFactSources,
} from "./repository";
import { toBenefitFacts } from "./facts";
import {
  canTransitionBenefitPolicy,
  type BenefitPolicyLifecycleStatus,
} from "./policy-lifecycle";

export async function getBenefitOperations(businessYearId?: string) {
  const policyWhere = businessYearId
    ? and(eq(benefitPolicies.businessYearId, businessYearId), isNull(benefitPolicies.deletedAt))
    : isNull(benefitPolicies.deletedAt);
  const [policies, rules, candidates, approvals, payments, studentRows] =
    await Promise.all([
      db.select().from(benefitPolicies).where(policyWhere),
      db.select().from(benefitEligibilityRules),
      db.select().from(benefitCandidates),
      db.select().from(benefitApprovals),
      db.select().from(benefitPayments),
      db.select({
        id: students.id,
        studentNumber: students.studentNumber,
        departmentCode: students.departmentCode,
        grade: students.grade,
      }).from(students),
    ]);
  const policyIds = new Set(policies.map((row) => row.id));
  const candidateRows = candidates.filter((row) => policyIds.has(row.policyId));
  const candidateIds = new Set(candidateRows.map((row) => row.id));
  const approvalRows = approvals.filter((row) => candidateIds.has(row.candidateId));
  const approvalIds = new Set(approvalRows.map((row) => row.id));
  return {
    policies,
    rules: rules.filter((row) => policyIds.has(row.policyId)),
    candidates: candidateRows,
    approvals: approvalRows,
    payments: payments.filter((row) => approvalIds.has(row.approvalId)),
    students: studentRows,
  };
}

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

export function transitionBenefitPolicy(
  id: string,
  input: BenefitPolicyStatusInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(benefitPolicies)
      .where(and(eq(benefitPolicies.id, id), isNull(benefitPolicies.deletedAt)))
      .for("update");
    if (!current) {
      throw new ApiError(404, "BENEFIT_POLICY_NOT_FOUND", "수혜정책을 찾을 수 없습니다.");
    }
    if (
      !canTransitionBenefitPolicy(
        current.status as BenefitPolicyLifecycleStatus,
        input.status,
      )
    ) {
      throw new ApiError(
        409,
        "BENEFIT_POLICY_STATUS_TRANSITION_INVALID",
        `${current.status} 상태에서 ${input.status} 상태로 변경할 수 없습니다.`,
      );
    }
    if (input.status === "OPEN") {
      const rules = await tx
        .select({ id: benefitEligibilityRules.id })
        .from(benefitEligibilityRules)
        .where(eq(benefitEligibilityRules.policyId, id));
      if (!rules.length) {
        throw new ApiError(
          409,
          "BENEFIT_POLICY_RULE_REQUIRED",
          "자격규칙이 없는 수혜정책은 시행할 수 없습니다.",
        );
      }
      if (current.effectiveTo && current.effectiveTo <= new Date()) {
        throw new ApiError(
          409,
          "BENEFIT_POLICY_ALREADY_EXPIRED",
          "적용 종료일이 지난 수혜정책은 시행할 수 없습니다.",
        );
      }
    }
    const [updated] = await tx
      .update(benefitPolicies)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(benefitPolicies.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "STATUS_CHANGE",
      resourceType: "BENEFIT_POLICY",
      resourceId: id,
      businessYearId: current.businessYearId,
      requestId,
      reason: input.reason,
      before: { status: current.status },
      after: { status: input.status },
      changedFields: ["status"],
    });
    return updated;
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

export function bulkCalculateBenefitCandidates(
  input: BenefitBulkCalculationInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const context = await getPolicyWithRules(tx, input.policyId);
    if (!context || context.policy.status !== "OPEN") {
      throw new ApiError(
        404,
        "ACTIVE_POLICY_NOT_FOUND",
        "시행 중인 수혜정책을 찾을 수 없습니다.",
      );
    }
    const sources = await loadBenefitStudentFactSources(
      tx,
      context.policy.businessYearId,
      input.studentIds,
    );
    if (sources.length > 500) {
      throw new ApiError(
        422,
        "BENEFIT_BULK_LIMIT_EXCEEDED",
        "일괄 산정은 한 번에 최대 500명까지 처리할 수 있습니다.",
      );
    }
    const existing = sources.length
      ? await tx
          .select({
            id: benefitCandidates.id,
            studentId: benefitCandidates.studentId,
          })
          .from(benefitCandidates)
          .where(
            and(
              eq(benefitCandidates.policyId, input.policyId),
              inArray(
                benefitCandidates.studentId,
                sources.map((source) => source.studentId),
              ),
            ),
          )
          .for("update")
      : [];
    const existingIds = existing.map((row) => row.id);
    const decidedCandidateIds = new Set(
      existingIds.length
        ? (
            await tx
              .select({ candidateId: benefitApprovals.candidateId })
              .from(benefitApprovals)
              .where(inArray(benefitApprovals.candidateId, existingIds))
          ).map((row) => row.candidateId)
        : [],
    );
    const existingByStudent = new Map(
      existing.map((row) => [row.studentId, row.id]),
    );
    const calculationVersion = "benefit-facts-v1";
    const calculatedAt = new Date();
    const bulkRunId = randomUUID();
    let committed = 0;
    const results = [];

    for (const source of sources) {
      const facts = toBenefitFacts(source);
      const ruleResults = context.rules.map((rule) => ({
        code: rule.code,
        name: rule.name,
        expression: rule.expression,
        satisfied: evaluateEligibility(
          rule.expression as EligibilityExpression,
          facts,
        ),
      }));
      const eligible = ruleResults.every((result) => result.satisfied);
      const calculatedAmount = eligible
        ? calculateBenefitAmount(
            context.policy.amountFormula as BenefitExpression,
            facts,
          )
        : 0;
      const currentCandidateId = existingByStudent.get(source.studentId);
      const skippedReason =
        currentCandidateId && decidedCandidateIds.has(currentCandidateId)
          ? ("DECIDED" as const)
          : null;
      results.push({
        studentId: source.studentId,
        eligible,
        calculatedAmount,
        skippedReason,
        facts,
        ruleResults: ruleResults.map(({ code, satisfied }) => ({
          code,
          satisfied,
        })),
      });
      if (input.dryRun || skippedReason) continue;

      const snapshot = {
        calculationVersion,
        bulkRunId,
        calculatedAt: calculatedAt.toISOString(),
        source: "DATABASE",
        policy: {
          id: context.policy.id,
          code: context.policy.code,
          formula: context.policy.amountFormula,
        },
        facts,
        ruleResults,
        eligible,
      };
      await tx
        .insert(benefitCandidates)
        .values({
          policyId: input.policyId,
          studentId: source.studentId,
          eligibilitySnapshot: snapshot,
          calculatedAmount: String(calculatedAmount),
          status: eligible ? "REVIEWING" : "REJECTED",
          calculatedAt,
        })
        .onConflictDoUpdate({
          target: [benefitCandidates.policyId, benefitCandidates.studentId],
          set: {
            eligibilitySnapshot: snapshot,
            calculatedAmount: String(calculatedAmount),
            status: eligible ? "REVIEWING" : "REJECTED",
            calculatedAt,
          },
        });
      committed += 1;
    }
    if (!input.dryRun) {
      await tx.insert(auditLogs).values({
        actorUserId: actorId,
        action: "BULK_CALCULATE",
        resourceType: "BENEFIT_POLICY",
        resourceId: context.policy.id,
        businessYearId: context.policy.businessYearId,
        requestId,
        metadata: {
          bulkRunId,
          calculationVersion,
          evaluated: results.length,
          committed,
          skippedDecided: results.filter((row) => row.skippedReason).length,
        },
      });
    }
    return {
      policyId: input.policyId,
      dryRun: input.dryRun,
      evaluated: results.length,
      eligible: results.filter((row) => row.eligible).length,
      ineligible: results.filter((row) => !row.eligible).length,
      committed,
      skippedDecided: results.filter((row) => row.skippedReason).length,
      calculationVersion,
      calculatedAt: calculatedAt.toISOString(),
      results,
    };
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
    if (candidate.status !== "REVIEWING") {
      throw new ApiError(409, "CANDIDATE_ALREADY_DECIDED", "이미 결정된 수혜 대상자입니다.");
    }
    if (input.approvedAmount > Number(candidate.calculatedAmount)) {
      throw new ApiError(422, "APPROVED_AMOUNT_EXCEEDS_CALCULATION", "승인액이 계산액을 초과합니다.");
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
    const [approval] = await tx.select().from(benefitApprovals)
      .where(eq(benefitApprovals.id, input.approvalId)).for("update");
    if (!approval || approval.decision !== "APPROVED") {
      throw new ApiError(404, "APPROVAL_NOT_FOUND", "지급 가능한 승인정보를 찾을 수 없습니다.");
    }
    if (input.amount > Number(approval.approvedAmount)) {
      throw new ApiError(422, "PAYMENT_EXCEEDS_APPROVAL", "지급액이 승인액을 초과합니다.");
    }
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
