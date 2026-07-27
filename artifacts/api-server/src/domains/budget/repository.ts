import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  budgetAllocations,
  budgetExecutions,
} from "@workspace/db/schema";

export function lockAllocation(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  id: string,
) {
  return transaction
    .select()
    .from(budgetAllocations)
    .where(and(eq(budgetAllocations.id, id), isNull(budgetAllocations.deletedAt)))
    .for("update");
}

export async function executedAmount(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  allocationId: string,
) {
  const [result] = await transaction
    .select({
      value: sql<string>`coalesce(sum(${budgetExecutions.amount}), 0)`,
    })
    .from(budgetExecutions)
    .where(
      and(
        eq(budgetExecutions.allocationId, allocationId),
        isNull(budgetExecutions.deletedAt),
      ),
    );
  return Number(result?.value ?? 0);
}
