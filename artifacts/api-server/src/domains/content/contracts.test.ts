import assert from "node:assert/strict";
import test from "node:test";
import { ContentDecisionSchema } from "@workspace/api-zod";

test("content publication can carry a scheduled timestamp", () => {
  assert.equal(ContentDecisionSchema.safeParse({
    action: "PUBLISH",
    publishAt: "2026-07-27T04:00:00.000Z",
  }).success, true);
});

test("non-publication transitions reject a publication timestamp", () => {
  assert.equal(ContentDecisionSchema.safeParse({
    action: "APPROVE",
    publishAt: "2026-07-27T04:00:00.000Z",
  }).success, false);
});
