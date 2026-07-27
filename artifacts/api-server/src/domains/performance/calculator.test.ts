import assert from "node:assert/strict";
import test from "node:test";
import { calculatePerformanceValue } from "./calculator";

test("calculates count and rate formulas from named DB sources", () => {
  const sources = { STUDENTS: 3, PROGRAM_APPLICATIONS: 2 };
  assert.equal(
    calculatePerformanceValue({ type: "COUNT", source: "STUDENTS" }, sources),
    3,
  );
  assert.equal(
    calculatePerformanceValue({
      type: "RATE",
      numerator: "PROGRAM_APPLICATIONS",
      denominator: "STUDENTS",
      multiplier: 100,
      precision: 2,
    }, sources),
    66.67,
  );
});
