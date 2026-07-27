import assert from "node:assert/strict";
import test from "node:test";
import { BudgetAllocationInputSchema } from "@workspace/api-zod";

test("budget plan cannot exceed its allocation", () => {
  assert.equal(BudgetAllocationInputSchema.safeParse({
    businessYearId: "fd010000-0000-4000-8000-000000000001",
    budgetCode: "TEST-01",
    category: "운영비",
    allocatedAmount: 1000,
    plannedAmount: 1100,
  }).success, false);
});
