import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = /^[a-f0-9]{64}$/;
const imageDigest = /^sha256:[a-f0-9]{64}$/;
const commitSha = /^[a-f0-9]{40}$/;
const requiredRoles = new Set([
  "REQUESTER",
  "TECHNICAL_REVIEWER",
  "CHANGE_APPROVER",
]);

export function validateReleaseApproval(record) {
  const errors = [];
  if (record.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!record.releaseId) errors.push("releaseId is required.");
  if (!["staging", "production"].includes(record.environment)) {
    errors.push("environment must be staging or production.");
  }
  if (!commitSha.test(record.commit ?? "")) errors.push("commit must be a full Git SHA.");
  if (record.sourceDirty !== false) errors.push("sourceDirty must be false.");
  if (!sha256.test(record.manifestSha256 ?? "")) errors.push("manifestSha256 is invalid.");
  if (!imageDigest.test(record.images?.api ?? "")) errors.push("API image digest is invalid.");
  if (!imageDigest.test(record.images?.portal ?? "")) errors.push("Portal image digest is invalid.");
  if (!sha256.test(record.sboms?.apiSha256 ?? "")) errors.push("API SBOM hash is invalid.");
  if (!sha256.test(record.sboms?.portalSha256 ?? "")) errors.push("Portal SBOM hash is invalid.");
  if (!record.migrationTarget) errors.push("migrationTarget is required.");
  if (!sha256.test(record.backup?.sha256 ?? "")) errors.push("Verified backup hash is required.");
  if (Number.isNaN(Date.parse(record.backup?.verifiedAt ?? ""))) {
    errors.push("Backup verification timestamp is invalid.");
  }
  if (!imageDigest.test(record.rollback?.apiImage ?? "")) {
    errors.push("Rollback API image digest is invalid.");
  }
  if (!imageDigest.test(record.rollback?.portalImage ?? "")) {
    errors.push("Rollback portal image digest is invalid.");
  }
  if (!record.rollback?.databaseStrategy) {
    errors.push("Rollback database strategy is required.");
  }
  const approvals = Array.isArray(record.approvals) ? record.approvals : [];
  const roles = new Set(approvals.map((approval) => approval.role));
  for (const role of requiredRoles) {
    if (!roles.has(role)) errors.push(`Missing approval role: ${role}.`);
  }
  const actors = approvals.map((approval) => approval.actorId).filter(Boolean);
  if (new Set(actors).size !== approvals.length) {
    errors.push("Approval actors must be distinct and non-empty.");
  }
  for (const approval of approvals) {
    if (!approval.reference || Number.isNaN(Date.parse(approval.approvedAt ?? ""))) {
      errors.push(`Approval metadata is incomplete for ${approval.role ?? "unknown role"}.`);
    }
  }
  if (Number.isNaN(Date.parse(record.scheduledAt ?? ""))) {
    errors.push("scheduledAt is invalid.");
  }
  return errors;
}

function run() {
  const approvalPath = process.argv[2];
  if (!approvalPath) throw new Error("Usage: release-approval.mjs <approval-record.json>");
  const record = JSON.parse(readFileSync(path.resolve(approvalPath), "utf8"));
  const errors = validateReleaseApproval(record);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Release approval record passed: ${record.releaseId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
