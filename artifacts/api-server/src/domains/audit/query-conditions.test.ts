import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { AuditLogQuerySchema } from "@workspace/api-zod";
import { conditionsFor } from "./query-conditions";

const dialect = new PgDialect();

function render(condition: ReturnType<typeof conditionsFor>) {
  assert.ok(condition, "expected a SQL condition");
  return dialect.sqlToQuery(condition);
}

test("AuditLogQuerySchema splits comma-separated actions into an array", () => {
  const parsed = AuditLogQuerySchema.parse({
    action: "GENERATE_SHARE_TOKEN,REVOKE_SHARE_TOKEN",
  });
  assert.deepEqual(parsed.action, [
    "GENERATE_SHARE_TOKEN",
    "REVOKE_SHARE_TOKEN",
  ]);
});

test("AuditLogQuerySchema trims whitespace and drops blank segments", () => {
  const parsed = AuditLogQuerySchema.parse({
    action: " GENERATE_SHARE_TOKEN , ,REVOKE_SHARE_TOKEN, ",
  });
  assert.deepEqual(parsed.action, [
    "GENERATE_SHARE_TOKEN",
    "REVOKE_SHARE_TOKEN",
  ]);
});

test("AuditLogQuerySchema keeps a single action working", () => {
  const parsed = AuditLogQuerySchema.parse({ action: "GENERATE_SHARE_TOKEN" });
  assert.deepEqual(parsed.action, ["GENERATE_SHARE_TOKEN"]);
});

test("AuditLogQuerySchema leaves action undefined when omitted", () => {
  const parsed = AuditLogQuerySchema.parse({});
  assert.equal(parsed.action, undefined);
});

test("AuditLogQuerySchema rejects more than 20 actions", () => {
  const tooMany = Array.from({ length: 21 }, (_, i) => `ACTION_${i}`).join(",");
  assert.equal(AuditLogQuerySchema.safeParse({ action: tooMany }).success, false);
});

test("multi-action filter builds an IN condition with every listed action", () => {
  const filters = AuditLogQuerySchema.parse({
    action: "GENERATE_SHARE_TOKEN,REVOKE_SHARE_TOKEN",
  });
  const { sql, params } = render(conditionsFor(filters));
  assert.match(sql, /"action" in \(/);
  assert.deepEqual(params, ["GENERATE_SHARE_TOKEN", "REVOKE_SHARE_TOKEN"]);
});

test("single-action filter still matches that action", () => {
  const filters = AuditLogQuerySchema.parse({ action: "REVOKE_SHARE_TOKEN" });
  const { params } = render(conditionsFor(filters));
  assert.deepEqual(params, ["REVOKE_SHARE_TOKEN"]);
});

test("empty action list produces no condition", () => {
  const filters = AuditLogQuerySchema.parse({});
  assert.equal(conditionsFor(filters), undefined);
});
