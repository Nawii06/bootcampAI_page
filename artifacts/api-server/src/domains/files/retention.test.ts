import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFileExpiry,
  evaluateRetentionOutcome,
} from "./retention-policy";

test("calculates DB-policy expiry separately for personal information", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const policy = { retentionDays: 10, personalInfoRetentionDays: 3 };
  assert.equal(
    calculateFileExpiry(createdAt, policy, false).toISOString(),
    "2026-01-11T00:00:00.000Z",
  );
  assert.equal(
    calculateFileExpiry(createdAt, policy, true).toISOString(),
    "2026-01-04T00:00:00.000Z",
  );
});

test("legal hold and live relationships prevent automatic purge", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  assert.equal(
    evaluateRetentionOutcome({
      now,
      legalHoldUntil: new Date("2026-08-01T00:00:00.000Z"),
      relationCount: 0,
    }),
    "SKIPPED_LEGAL_HOLD",
  );
  assert.equal(
    evaluateRetentionOutcome({ now, legalHoldUntil: null, relationCount: 1 }),
    "SKIPPED_RELATION",
  );
  assert.equal(
    evaluateRetentionOutcome({ now, legalHoldUntil: null, relationCount: 0 }),
    "ELIGIBLE",
  );
});
