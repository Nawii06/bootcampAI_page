/**
 * Integration tests for the portfolio share-token revoke flow.
 *
 * Covers the security-relevant guarantees:
 *  - revoke clears evidence.shareToken
 *  - GET /v1/public/portfolio/:oldToken returns 404 after revocation
 *  - another student cannot revoke someone else's link (404, token stays)
 *  - regenerating yields a new working token, different from the old one
 *  - revoke without an existing token is a no-op (still { revoked: true })
 *
 * Runs against the real dev database over HTTP using mock auth headers.
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";

process.env.ENABLE_MOCK_AUTH = "true";
process.env.NODE_ENV = process.env.NODE_ENV === "production" ? "test" : (process.env.NODE_ENV ?? "test");

const { db, pool } = await import("@workspace/db");
const { businessYears, experientialRecords, students, users, auditLogs } =
  await import("@workspace/db/schema");
const { eq, inArray } = await import("drizzle-orm");
const { default: app } = await import("../../app");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const suffix = randomUUID().slice(0, 8);
const ownerUserId = randomUUID();
const otherUserId = randomUUID();

let server: Server;
let baseUrl: string;
let businessYearId: string;
let ownerStudentId: string;
let otherStudentId: string;
const recordIds: string[] = [];

function authHeaders(userId: string) {
  return {
    "x-mock-user-id": userId,
    "x-mock-roles": "STUDENT",
    "content-type": "application/json",
  };
}

async function createRecord(evidence: Record<string, unknown>) {
  const [record] = await db
    .insert(experientialRecords)
    .values({
      businessYearId,
      studentId: ownerStudentId,
      type: "PROJECT",
      title: `공유 토큰 테스트 ${suffix}`,
      status: "SUBMITTED",
      evidence,
    })
    .returning();
  assert.ok(record);
  recordIds.push(record.id);
  return record;
}

before(async () => {
  const [year] = await db
    .insert(businessYears)
    .values({
      year: 9000 + Math.floor(Math.random() * 900),
      name: `테스트 사업연도 ${suffix}`,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
    })
    .returning();
  assert.ok(year);
  businessYearId = year.id;

  await db.insert(users).values([
    { id: ownerUserId, loginId: `share-owner-${suffix}`, displayName: "링크 소유 학생" },
    { id: otherUserId, loginId: `share-other-${suffix}`, displayName: "다른 학생" },
  ]);
  const insertedStudents = await db
    .insert(students)
    .values([
      {
        userId: ownerUserId,
        studentNumber: `SO-${suffix}`,
        name: "링크 소유 학생",
        departmentCode: "AI",
      },
      {
        userId: otherUserId,
        studentNumber: `SX-${suffix}`,
        name: "다른 학생",
        departmentCode: "AI",
      },
    ])
    .returning();
  ownerStudentId = insertedStudents.find((s) => s.userId === ownerUserId)!.id;
  otherStudentId = insertedStudents.find((s) => s.userId === otherUserId)!.id;

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server?.close();
  if (recordIds.length > 0) {
    await db
      .delete(auditLogs)
      .where(inArray(auditLogs.resourceId, recordIds));
    await db
      .delete(experientialRecords)
      .where(inArray(experientialRecords.id, recordIds));
  }
  if (ownerStudentId) await db.delete(students).where(eq(students.id, ownerStudentId));
  if (otherStudentId) await db.delete(students).where(eq(students.id, otherStudentId));
  await db.delete(users).where(inArray(users.id, [ownerUserId, otherUserId]));
  if (businessYearId) {
    await db.delete(businessYears).where(eq(businessYears.id, businessYearId));
  }
  await pool.end();
});

async function loadEvidence(recordId: string) {
  const row = await db.query.experientialRecords.findFirst({
    where: eq(experientialRecords.id, recordId),
  });
  assert.ok(row);
  return row.evidence as Record<string, unknown>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test("revoke clears shareToken and the old public URL returns 404; regenerate issues a new working token", async () => {
  const record = await createRecord({
    summary: "요약",
    publicConsent: true,
    shareToken: `old-token-${suffix}`,
  });
  const oldToken = `old-token-${suffix}`;

  // Sanity: public URL works before revocation.
  const beforeRes = await fetch(`${baseUrl}/api/v1/public/portfolio/${oldToken}`);
  assert.equal(beforeRes.status, 200);

  // Revoke as the owner.
  const revokeRes = await fetch(
    `${baseUrl}/api/v1/experiential-records/${record.id}/share-token`,
    { method: "DELETE", headers: authHeaders(ownerUserId) },
  );
  assert.equal(revokeRes.status, 200);
  assert.deepEqual(await revokeRes.json(), { revoked: true });

  // shareToken is gone from evidence; other evidence fields survive.
  const evidence = await loadEvidence(record.id);
  assert.equal("shareToken" in evidence, false);
  assert.equal(evidence.publicConsent, true);
  assert.equal(evidence.summary, "요약");

  // Old public URL now 404s.
  const afterRes = await fetch(`${baseUrl}/api/v1/public/portfolio/${oldToken}`);
  assert.equal(afterRes.status, 404);

  // Regenerate: new token differs from the old one and works publicly.
  const regenRes = await fetch(
    `${baseUrl}/api/v1/experiential-records/${record.id}/share-token`,
    { method: "POST", headers: authHeaders(ownerUserId) },
  );
  assert.equal(regenRes.status, 200);
  const { shareToken: newToken } = (await regenRes.json()) as {
    shareToken: string;
  };
  assert.ok(newToken);
  assert.notEqual(newToken, oldToken);

  const newRes = await fetch(`${baseUrl}/api/v1/public/portfolio/${newToken}`);
  assert.equal(newRes.status, 200);
  const body = (await newRes.json()) as { title: string };
  assert.equal(body.title, `공유 토큰 테스트 ${suffix}`);

  // Old token still dead after regeneration.
  const oldAgain = await fetch(`${baseUrl}/api/v1/public/portfolio/${oldToken}`);
  assert.equal(oldAgain.status, 404);
});

test("another student cannot revoke someone else's link (404) and the token keeps working", async () => {
  const token = `victim-token-${suffix}`;
  const record = await createRecord({ publicConsent: true, shareToken: token });

  const res = await fetch(
    `${baseUrl}/api/v1/experiential-records/${record.id}/share-token`,
    { method: "DELETE", headers: authHeaders(otherUserId) },
  );
  assert.equal(res.status, 404);

  // Token untouched and public URL still works.
  const evidence = await loadEvidence(record.id);
  assert.equal(evidence.shareToken, token);
  const publicRes = await fetch(`${baseUrl}/api/v1/public/portfolio/${token}`);
  assert.equal(publicRes.status, 200);
});

test("revoking when no token exists is a no-op that still reports revoked", async () => {
  const record = await createRecord({ publicConsent: true });
  const beforeUpdatedAt = (
    await db.query.experientialRecords.findFirst({
      where: eq(experientialRecords.id, record.id),
    })
  )?.updatedAt;

  const res = await fetch(
    `${baseUrl}/api/v1/experiential-records/${record.id}/share-token`,
    { method: "DELETE", headers: authHeaders(ownerUserId) },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { revoked: true });

  const evidence = await loadEvidence(record.id);
  assert.equal("shareToken" in evidence, false);
  // No-op: the record was not rewritten.
  const afterUpdatedAt = (
    await db.query.experientialRecords.findFirst({
      where: eq(experientialRecords.id, record.id),
    })
  )?.updatedAt;
  assert.equal(afterUpdatedAt?.getTime(), beforeUpdatedAt?.getTime());
});
