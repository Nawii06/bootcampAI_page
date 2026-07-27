import assert from "node:assert/strict";
import test from "node:test";
import { validateReleaseApproval } from "./release-approval.mjs";

const hash = "a".repeat(64);
const digest = `sha256:${hash}`;
const record = {
  schemaVersion: 1,
  releaseId: "release-001",
  environment: "production",
  commit: "b".repeat(40),
  sourceDirty: false,
  manifestSha256: hash,
  images: { api: digest, portal: digest },
  sboms: { apiSha256: hash, portalSha256: hash },
  migrationTarget: "0006_pink_giant_man",
  backup: { sha256: hash, verifiedAt: "2026-07-27T00:00:00.000Z" },
  rollback: {
    apiImage: digest,
    portalImage: digest,
    databaseStrategy: "forward-fix",
  },
  approvals: [
    { role: "REQUESTER", actorId: "staff-1", approvedAt: "2026-07-27T01:00:00.000Z", reference: "CHG-1" },
    { role: "TECHNICAL_REVIEWER", actorId: "staff-2", approvedAt: "2026-07-27T02:00:00.000Z", reference: "CHG-1" },
    { role: "CHANGE_APPROVER", actorId: "staff-3", approvedAt: "2026-07-27T03:00:00.000Z", reference: "CHG-1" },
  ],
  scheduledAt: "2026-07-28T00:00:00.000Z",
};

test("accepts a complete release approval with separated duties", () => {
  assert.deepEqual(validateReleaseApproval(record), []);
});

test("rejects missing approval roles and reused actors", () => {
  const invalid = {
    ...record,
    approvals: [
      record.approvals[0],
      { ...record.approvals[1], actorId: "staff-1" },
    ],
  };
  const errors = validateReleaseApproval(invalid);
  assert.ok(errors.some((error) => error.includes("CHANGE_APPROVER")));
  assert.ok(errors.some((error) => error.includes("distinct")));
});
