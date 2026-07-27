import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  budgetAllocations,
  budgetChangeHistory,
  budgetExecutions,
  programs,
  storedFiles,
  users,
} from "@workspace/db/schema";
import type {
  BudgetAllocationInput,
  BudgetAmountChange,
  BudgetExecutionInput,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { executedAmount, lockAllocation } from "./repository";

export function createAllocation(
  input: BudgetAllocationInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [allocation] = await tx
      .insert(budgetAllocations)
      .values({
        ...input,
        allocatedAmount: String(input.allocatedAmount),
        plannedAmount: String(input.plannedAmount),
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "BUDGET_ALLOCATION",
      resourceId: allocation?.id,
      businessYearId: input.businessYearId,
      requestId,
      after: input,
    });
    return allocation;
  });
}

export function createExecution(
  input: BudgetExecutionInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [allocation] = await lockAllocation(tx, input.allocationId);
    if (!allocation) {
      throw new ApiError(404, "BUDGET_ALLOCATION_NOT_FOUND", "예산 배정을 찾을 수 없습니다.");
    }
    const alreadyExecuted = await executedAmount(tx, input.allocationId);
    const balance = Number(allocation.allocatedAmount) - alreadyExecuted;
    if (input.amount > balance) {
      throw new ApiError(409, "BUDGET_BALANCE_EXCEEDED", "예산 잔액을 초과할 수 없습니다.");
    }
    if (input.evidenceFileId) {
      const [evidenceFile] = await tx
        .select({ id: storedFiles.id })
        .from(storedFiles)
        .where(
          and(
            eq(storedFiles.id, input.evidenceFileId),
            isNull(storedFiles.deletedAt),
            isNull(storedFiles.purgedAt),
          ),
        )
        .for("key share");
      if (!evidenceFile) {
        throw new ApiError(
          422,
          "BUDGET_EVIDENCE_FILE_NOT_AVAILABLE",
          "사용 가능한 예산 증빙파일을 찾을 수 없습니다.",
        );
      }
    }
    const [execution] = await tx
      .insert(budgetExecutions)
      .values({
        ...input,
        amount: String(input.amount),
        executedAt: new Date(input.executedAt),
        createdBy: actorId,
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "BUDGET_EXECUTION",
      resourceId: execution?.id,
      businessYearId: allocation.businessYearId,
      requestId,
      after: {
        allocationId: input.allocationId,
        amount: input.amount,
        purpose: input.purpose,
        evidenceFileId: input.evidenceFileId,
      },
    });
    return execution;
  });
}

export function changeAllocationAmount(
  input: BudgetAmountChange,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [allocation] = await lockAllocation(tx, input.allocationId);
    if (!allocation) {
      throw new ApiError(404, "BUDGET_ALLOCATION_NOT_FOUND", "예산 배정을 찾을 수 없습니다.");
    }
    const previousAmount = Number(allocation[input.field]);
    if (input.field === "allocatedAmount") {
      const executed = await executedAmount(tx, input.allocationId);
      if (input.newAmount < executed) {
        throw new ApiError(409, "AMOUNT_BELOW_EXECUTION", "배정액은 이미 집행된 금액보다 작을 수 없습니다.");
      }
      if (input.newAmount < Number(allocation.plannedAmount)) {
        throw new ApiError(409, "AMOUNT_BELOW_PLAN", "배정액은 편성액보다 작을 수 없습니다.");
      }
    } else if (input.newAmount > Number(allocation.allocatedAmount)) {
      throw new ApiError(409, "PLAN_EXCEEDS_ALLOCATION", "편성액은 배정액을 초과할 수 없습니다.");
    }
    const snapshot = {
      allocationId: allocation.id,
      field: input.field,
      previousAmount,
      newAmount: input.newAmount,
    };
    await tx
      .update(budgetAllocations)
      .set({ [input.field]: String(input.newAmount), updatedAt: new Date() })
      .where(eq(budgetAllocations.id, input.allocationId));
    await tx.insert(budgetChangeHistory).values({
      entityType: "BUDGET_ALLOCATION",
      entityId: allocation.id,
      fieldName: input.field,
      previousAmount: String(previousAmount),
      newAmount: String(input.newAmount),
      reason: input.reason,
      snapshot,
      changedBy: actorId,
    });
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CHANGE_AMOUNT",
      resourceType: "BUDGET_ALLOCATION",
      resourceId: allocation.id,
      businessYearId: allocation.businessYearId,
      requestId,
      reason: input.reason,
      changedFields: [input.field],
      before: { [input.field]: previousAmount },
      after: { [input.field]: input.newAmount },
    });
    return snapshot;
  });
}

export async function getBudgetSummary(
  businessYearId: string,
  programId?: string,
) {
  const conditions = and(
    eq(budgetAllocations.businessYearId, businessYearId),
    programId ? eq(budgetAllocations.programId, programId) : undefined,
    isNull(budgetAllocations.deletedAt),
  );
  const [totals] = await db
    .select({
      allocated: sql<string>`coalesce(sum(${budgetAllocations.allocatedAmount}), 0)`,
      planned: sql<string>`coalesce(sum(${budgetAllocations.plannedAmount}), 0)`,
    })
    .from(budgetAllocations)
    .where(conditions);
  const [executions] = await db
    .select({
      executed: sql<string>`coalesce(sum(${budgetExecutions.amount}), 0)`,
    })
    .from(budgetExecutions)
    .innerJoin(
      budgetAllocations,
      eq(budgetAllocations.id, budgetExecutions.allocationId),
    )
    .where(and(conditions, isNull(budgetExecutions.deletedAt)));
  const allocated = Number(totals?.allocated ?? 0);
  const planned = Number(totals?.planned ?? 0);
  const executed = Number(executions?.executed ?? 0);
  return {
    allocated,
    planned,
    executed,
    balance: allocated - executed,
    executionRate: allocated === 0 ? 0 : Math.round((executed / allocated) * 10_000) / 100,
  };
}

export async function getBudgetOperations(
  businessYearId: string,
  programId?: string,
) {
  const conditions = and(
    eq(budgetAllocations.businessYearId, businessYearId),
    programId ? eq(budgetAllocations.programId, programId) : undefined,
    isNull(budgetAllocations.deletedAt),
  );
  const allocations = await db.select({
    id: budgetAllocations.id,
    businessYearId: budgetAllocations.businessYearId,
    programId: budgetAllocations.programId,
    programName: programs.name,
    budgetCode: budgetAllocations.budgetCode,
    category: budgetAllocations.category,
    allocatedAmount: budgetAllocations.allocatedAmount,
    plannedAmount: budgetAllocations.plannedAmount,
    internalApprovalNumber: budgetAllocations.internalApprovalNumber,
    erpReference: budgetAllocations.erpReference,
    rcmsReference: budgetAllocations.rcmsReference,
  }).from(budgetAllocations)
    .leftJoin(programs, eq(programs.id, budgetAllocations.programId))
    .where(conditions);
  const allocationIds = new Set(allocations.map((row) => row.id));
  const executions = (await db.select().from(budgetExecutions)
    .where(isNull(budgetExecutions.deletedAt)))
    .filter((row) => allocationIds.has(row.allocationId));
  return { allocations, executions };
}

export function listBudgetChangeHistory(filters: {
  businessYearId?: string;
  allocationId?: string;
  limit: number;
}) {
  return db
    .select({
      id: budgetChangeHistory.id,
      allocationId: budgetChangeHistory.entityId,
      budgetCode: budgetAllocations.budgetCode,
      category: budgetAllocations.category,
      fieldName: budgetChangeHistory.fieldName,
      previousAmount: budgetChangeHistory.previousAmount,
      newAmount: budgetChangeHistory.newAmount,
      reason: budgetChangeHistory.reason,
      changedBy: budgetChangeHistory.changedBy,
      changedByName: users.displayName,
      changedAt: budgetChangeHistory.changedAt,
    })
    .from(budgetChangeHistory)
    .innerJoin(
      budgetAllocations,
      eq(budgetAllocations.id, budgetChangeHistory.entityId),
    )
    .innerJoin(users, eq(users.id, budgetChangeHistory.changedBy))
    .where(
      and(
        eq(budgetChangeHistory.entityType, "BUDGET_ALLOCATION"),
        filters.businessYearId
          ? eq(budgetAllocations.businessYearId, filters.businessYearId)
          : undefined,
        filters.allocationId
          ? eq(budgetChangeHistory.entityId, filters.allocationId)
          : undefined,
      ),
    )
    .orderBy(desc(budgetChangeHistory.changedAt))
    .limit(filters.limit);
}
