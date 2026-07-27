import assert from "node:assert/strict";
import test from "node:test";
import {
  BenefitApprovalInputSchema,
  BenefitPaymentInputSchema,
} from "@workspace/api-zod";

test("rejected benefit decisions require a zero approved amount", () => {
  assert.equal(BenefitApprovalInputSchema.safeParse({
    candidateId: "fd010000-0000-4000-8300-000000000001",
    decision: "REJECTED",
    approvedAmount: 1000,
  }).success, false);
});

test("paid benefit status requires ERP reference and paid timestamp", () => {
  const base = {
    approvalId: "fd010000-0000-4000-8500-000000000001",
    amount: 1200000,
    status: "PAID",
  };
  assert.equal(BenefitPaymentInputSchema.safeParse(base).success, false);
  assert.equal(BenefitPaymentInputSchema.safeParse({
    ...base,
    erpReference: "ERP-2026-001",
    paidAt: "2026-07-27T03:00:00.000Z",
  }).success, true);
});
