import assert from "node:assert/strict";
import test from "node:test";
import { BenefitPolicyInputSchema } from "@workspace/api-zod";
import { canTransitionBenefitPolicy } from "./policy-lifecycle";

test("allows only forward benefit policy lifecycle transitions", () => {
  assert.equal(canTransitionBenefitPolicy("DRAFT", "OPEN"), true);
  assert.equal(canTransitionBenefitPolicy("OPEN", "CLOSED"), true);
  assert.equal(canTransitionBenefitPolicy("CLOSED", "ARCHIVED"), true);
  assert.equal(canTransitionBenefitPolicy("CLOSED", "OPEN"), false);
  assert.equal(canTransitionBenefitPolicy("ARCHIVED", "OPEN"), false);
});

test("rejects a benefit policy whose effective range is reversed", () => {
  const result = BenefitPolicyInputSchema.safeParse({
    businessYearId: "11111111-1111-4111-8111-111111111111",
    code: "SCHOLARSHIP",
    name: "장학금",
    benefitType: "SCHOLARSHIP",
    amountFormula: { type: "FIXED", amount: 100000 },
    effectiveFrom: "2026-12-31T00:00:00.000Z",
    effectiveTo: "2026-01-01T00:00:00.000Z",
    rules: [{
      code: "GRADE",
      name: "학년",
      expression: { fact: "grade", operator: "GTE", value: 1 },
      sortOrder: 0,
    }],
  });
  assert.equal(result.success, false);
});
