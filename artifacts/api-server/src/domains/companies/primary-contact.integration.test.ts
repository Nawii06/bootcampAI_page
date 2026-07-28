/**
 * Integration tests for 대표 담당자 (primary contact) rules.
 *
 * Covers:
 *  - archiving the primary promotes the oldest remaining active contact
 *  - archiving a non-primary changes nothing
 *  - PATCH /v1/company-contacts/:id/primary demotes the old primary
 *  - setting the current primary is a no-op
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
const { auditLogs, companies, companyContacts, users } = await import("@workspace/db/schema");
const { eq, inArray } = await import("drizzle-orm");
const { default: app } = await import("../../app");

const suffix = randomUUID().slice(0, 8);
const staffUserId = randomUUID();

let server: Server;
let baseUrl: string;
let companyId: string;
const contactIds: string[] = [];

const headers = {
  "x-mock-user-id": staffUserId,
  "x-mock-roles": "COMPANY_STAFF",
  "content-type": "application/json",
};

async function seedContact(name: string, isPrimary: boolean, createdAt: Date) {
  const [contact] = await db
    .insert(companyContacts)
    .values({ companyId, name, isPrimary, createdAt })
    .returning();
  assert.ok(contact);
  contactIds.push(contact.id);
  return contact;
}

async function loadContacts() {
  return db.select().from(companyContacts).where(inArray(companyContacts.id, contactIds));
}

function activePrimaries(rows: (typeof companyContacts.$inferSelect)[]) {
  return rows.filter((r) => r.deletedAt === null && r.isPrimary);
}

before(async () => {
  await db.insert(users).values({
    id: staffUserId,
    loginId: `contact-staff-${suffix}`,
    displayName: "담당자 테스트 직원",
  });
  const [company] = await db
    .insert(companies)
    .values({ name: `대표담당자 테스트 기업 ${suffix}`, companyType: "SME" })
    .returning();
  assert.ok(company);
  companyId = company.id;

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server?.close();
  if (contactIds.length > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.resourceId, contactIds));
    await db.delete(companyContacts).where(inArray(companyContacts.id, contactIds));
  }
  if (companyId) await db.delete(companies).where(eq(companies.id, companyId));
  await db.delete(users).where(eq(users.id, staffUserId));
  await pool.end();
});

test("archiving the primary promotes the oldest remaining active contact", async () => {
  const primary = await seedContact("대표 A", true, new Date("2026-01-01T00:00:00Z"));
  const oldest = await seedContact("고참 B", false, new Date("2026-02-01T00:00:00Z"));
  const newest = await seedContact("신입 C", false, new Date("2026-03-01T00:00:00Z"));

  const res = await fetch(`${baseUrl}/api/v1/company-contacts/${primary.id}`, {
    method: "DELETE",
    headers,
  });
  assert.equal(res.status, 200);
  const archived = await res.json();
  assert.equal(archived.isPrimary, false);
  assert.ok(archived.deletedAt);

  const rows = await loadContacts();
  const primaries = activePrimaries(rows);
  assert.equal(primaries.length, 1);
  assert.equal(primaries[0]!.id, oldest.id);
  assert.equal(rows.find((r) => r.id === newest.id)!.isPrimary, false);
});

test("archiving a non-primary leaves the primary unchanged", async () => {
  const rowsBefore = await loadContacts();
  const primaryBefore = activePrimaries(rowsBefore)[0]!;
  const nonPrimary = rowsBefore.find((r) => r.deletedAt === null && !r.isPrimary)!;

  const res = await fetch(`${baseUrl}/api/v1/company-contacts/${nonPrimary.id}`, {
    method: "DELETE",
    headers,
  });
  assert.equal(res.status, 200);

  const rows = await loadContacts();
  const primaries = activePrimaries(rows);
  assert.equal(primaries.length, 1);
  assert.equal(primaries[0]!.id, primaryBefore.id);
});

test("setting a new primary demotes the old one", async () => {
  const rowsBefore = await loadContacts();
  const oldPrimary = activePrimaries(rowsBefore)[0]!;
  const candidate = await seedContact("새 대표 D", false, new Date("2026-04-01T00:00:00Z"));

  const res = await fetch(`${baseUrl}/api/v1/company-contacts/${candidate.id}/primary`, {
    method: "PATCH",
    headers,
  });
  assert.equal(res.status, 200);
  const updated = await res.json();
  assert.equal(updated.isPrimary, true);

  const rows = await loadContacts();
  const primaries = activePrimaries(rows);
  assert.equal(primaries.length, 1);
  assert.equal(primaries[0]!.id, candidate.id);
  assert.equal(rows.find((r) => r.id === oldPrimary.id)!.isPrimary, false);
});

test("setting the current primary is a no-op", async () => {
  const rowsBefore = await loadContacts();
  const primary = activePrimaries(rowsBefore)[0]!;

  const res = await fetch(`${baseUrl}/api/v1/company-contacts/${primary.id}/primary`, {
    method: "PATCH",
    headers,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, primary.id);
  assert.equal(body.isPrimary, true);

  const rows = await loadContacts();
  const primaries = activePrimaries(rows);
  assert.equal(primaries.length, 1);
  assert.equal(primaries[0]!.id, primary.id);
});

test("archiving a missing or already-archived contact returns 404", async () => {
  const res = await fetch(`${baseUrl}/api/v1/company-contacts/${randomUUID()}`, {
    method: "DELETE",
    headers,
  });
  assert.equal(res.status, 404);
});
