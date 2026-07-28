/**
 * Integration test for per-IP rate limiting on the public portfolio endpoint.
 *
 * The endpoint is unauthenticated, so anonymous clients must be throttled to
 * prevent brute-force guessing of share tokens. The limit is configurable via
 * PUBLIC_PORTFOLIO_RATE_LIMIT; we set it low here so the test stays fast.
 *
 * Covers:
 *  - a legitimate single visit succeeds (200 for a valid token)
 *  - repeated requests beyond the limit get 429 with a RATE_LIMITED code
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";

process.env.ENABLE_MOCK_AUTH = "true";
process.env.NODE_ENV =
  process.env.NODE_ENV === "production" ? "test" : (process.env.NODE_ENV ?? "test");
process.env.PUBLIC_PORTFOLIO_RATE_LIMIT = "5";

const { db, pool } = await import("@workspace/db");
const { businessYears, experientialRecords, students, users, auditLogs } =
  await import("@workspace/db/schema");
const { eq, inArray } = await import("drizzle-orm");
const { default: app } = await import("../../app");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const suffix = randomUUID().slice(0, 8);
const ownerUserId = randomUUID();
const shareToken = `rate-limit-token-${suffix}`;

let server: Server;
let baseUrl: string;
let businessYearId: string;
let ownerStudentId: string;
const recordIds: string[] = [];

before(async () => {
  const [year] = await db
    .insert(businessYears)
    .values({
      year: 9000 + Math.floor(Math.random() * 900),
      name: `레이트리밋 테스트 사업연도 ${suffix}`,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
    })
    .returning();
  assert.ok(year);
  businessYearId = year.id;

  await db.insert(users).values([
    {
      id: ownerUserId,
      loginId: `rate-limit-owner-${suffix}`,
      displayName: "레이트리밋 학생",
    },
  ]);
  const [student] = await db
    .insert(students)
    .values([
      {
        userId: ownerUserId,
        studentNumber: `RL-${suffix}`,
        name: "레이트리밋 학생",
        departmentCode: "AI",
      },
    ])
    .returning();
  assert.ok(student);
  ownerStudentId = student.id;

  const [record] = await db
    .insert(experientialRecords)
    .values({
      businessYearId,
      studentId: ownerStudentId,
      type: "PROJECT",
      title: `레이트리밋 테스트 ${suffix}`,
      status: "SUBMITTED",
      evidence: { summary: "요약", publicConsent: true, shareToken },
    })
    .returning();
  assert.ok(record);
  recordIds.push(record.id);

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
  if (ownerStudentId)
    await db.delete(students).where(eq(students.id, ownerStudentId));
  await db.delete(users).where(eq(users.id, ownerUserId));
  if (businessYearId) {
    await db.delete(businessYears).where(eq(businessYears.id, businessYearId));
  }
  await pool.end();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

test("throttles repeated public portfolio requests from one client with 429", async () => {
  const limit = 5;

  // Legitimate visits within the limit succeed.
  for (let i = 0; i < limit; i++) {
    const res = await fetch(`${baseUrl}/api/v1/public/portfolio/${shareToken}`);
    assert.equal(res.status, 200, `request ${i + 1} within the limit should be 200`);
  }

  // The next request from the same client is throttled.
  const throttled = await fetch(
    `${baseUrl}/api/v1/public/portfolio/${shareToken}`,
  );
  assert.equal(throttled.status, 429);
  const body = (await throttled.json()) as { code?: string };
  assert.equal(body.code, "RATE_LIMITED");
  assert.ok(throttled.headers.get("retry-after"), "Retry-After header is set");
});

test("guessing invalid tokens is also throttled (does not bypass the limiter)", async () => {
  // The limiter counts per IP regardless of token validity, so the client is
  // already over the limit from the previous test's requests.
  const res = await fetch(
    `${baseUrl}/api/v1/public/portfolio/guess-${randomUUID()}`,
  );
  assert.equal(res.status, 429);
});
