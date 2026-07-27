import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBenefitAmount,
  evaluateEligibility,
} from "./calculator";

test("evaluates DB-defined eligibility expressions", () => {
  assert.equal(
    evaluateEligibility(
      { fact: "progressRate", operator: "GTE", value: 80 },
      { progressRate: 85 },
    ),
    true,
  );
  assert.equal(
    evaluateEligibility(
      { fact: "track", operator: "IN", value: ["AI", "RAIL"] },
      { track: "INFRA" },
    ),
    false,
  );
});

test("calculates a capped policy amount without hardcoded scholarship values", () => {
  assert.equal(
    calculateBenefitAmount(
      {
        type: "MULTIPLY",
        fact: "recognizedHours",
        rate: 20_000,
        maximumAmount: 500_000,
      },
      { recognizedHours: 30 },
    ),
    500_000,
  );
});
