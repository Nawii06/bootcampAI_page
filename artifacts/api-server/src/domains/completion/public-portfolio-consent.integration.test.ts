/**
 * Integration tests for the public portfolio endpoint's consent/soft-delete guards.
 *
 * Covers:
 *  - a record with a shareToken but publicConsent=false → public URL 404
 *  - a soft-deleted record (deletedAt set) with a valid token → public URL 404
 *
 * Runs against the real dev database over HTTP (mock auth not needed — the
 * public endpoint is unauthenticated), following the pattern in
 * share-token-revocation.integration.test.ts.
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

let server: Server;
let baseUrl: string;
let businessYearId: string;
let ownerStudentId: string;
const recordIds: string[] = [];

async function createRecord(
  evidence: Record<string, unknown>,
  extra: { deletedAt?: Date } = {},
) {
  const [record] = await db
    .insert(experientialRecords)
    .values({
      businessYearId,
      studentId: ownerStudentId,
      type: "PROJECT",
      title: `공개 동의 테스트 ${suffix}`,
      status: "SUBMITTED",
      evidence,
      ...extra,
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
    { id: ownerUserId, loginId: `consent-owner-${suffix}`, displayName: "동의 철회 학생" },
  ]);
  const [student] = await db
    .insert(students)
    .values([
      {
        userId: ownerUserId,
        studentNumber: `CO-${suffix}`,
        name: "동의 철회 학생",
        departmentCode: "AI",
      },
    ])
    .returning();
  assert.ok(student);
  ownerStudentId = student.id;

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
    await db.delete(auditLogs).where(inArray(auditLogs.resourceId, recordIds));
    await db
      .delete(experientialRecords)
      .where(inArray(experientialRecords.id, recordIds));
  }
  if (ownerStudentId) await db.delete(students).where(eq(students.id, ownerStudentId));
  await db.delete(users).where(eq(users.id, ownerUserId));
  if (businessYearId) {
    await db.delete(businessYears).where(eq(businessYears.id, businessYearId));
  }
  await pool.end();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

test("public URL 404s when publicConsent is withdrawn even though the shareToken still exists", async () => {
  const token = `no-consent-token-${suffix}`;
  const record = await createRecord({
    summary: "요약",
    publicConsent: true,
    shareToken: token,
  });

  // Sanity: link works while consent is given.
  const beforeRes = await fetch(`${baseUrl}/api/v1/public/portfolio/${token}`);
  assert.equal(beforeRes.status, 200);

  // Student withdraws consent; the shareToken remains in evidence.
  await db
    .update(experientialRecords)
    .set({ evidence: { summary: "요약", publicConsent: false, shareToken: token } })
    .where(eq(experientialRecords.id, record.id));

  const res = await fetch(`${baseUrl}/api/v1/public/portfolio/${token}`);
  assert.equal(res.status, 404);
  const body = (await res.json()) as { code?: string; error?: { code?: string } };
  const code = body.code ?? body.error?.code;
  assert.equal(code, "PORTFOLIO_NOT_FOUND");
});

test("public URL 404s for a soft-deleted record with a valid token and consent", async () => {
  const token = `deleted-token-${suffix}`;
  const record = await createRecord({
    summary: "요약",
    publicConsent: true,
    shareToken: token,
  });

  // Sanity: works while alive.
  const beforeRes = await fetch(`${baseUrl}/api/v1/public/portfolio/${token}`);
  assert.equal(beforeRes.status, 200);

  // Soft-delete the record.
  await db
    .update(experientialRecords)
    .set({ deletedAt: new Date() })
    .where(eq(experientialRecords.id, record.id));

  const res = await fetch(`${baseUrl}/api/v1/public/portfolio/${token}`);
  assert.equal(res.status, 404);
});
