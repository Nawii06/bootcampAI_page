/**
 * Unit tests for resourceHighlightLink: audit-log resource references must
 * resolve to admin list deep links carrying ?highlight=<id>, and unmapped
 * or incomplete references must return undefined (rendered as plain text).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resourceHighlightLink } from "../src/lib/resource-links.ts";

test("maps known resource types to their admin list with ?highlight=", () => {
  assert.equal(
    resourceHighlightLink("PROGRAM", "prog-1"),
    "/admin/programs?highlight=prog-1",
  );
  assert.equal(
    resourceHighlightLink("PROGRAM_APPLICATION", "app-9"),
    "/admin/applications?highlight=app-9",
  );
  assert.equal(
    resourceHighlightLink("COMPANY", "co-3"),
    "/admin/partners?highlight=co-3",
  );
  assert.equal(
    resourceHighlightLink("COMPLETION_ASSESSMENT", "ca-2"),
    "/admin/completion?highlight=ca-2",
  );
  assert.equal(
    resourceHighlightLink("STORED_FILE", "file-7"),
    "/admin/evidence?highlight=file-7",
  );
  assert.equal(
    resourceHighlightLink("PERFORMANCE_INDICATOR", "ind-4"),
    "/admin/performance/indicators?highlight=ind-4",
  );
  assert.equal(
    resourceHighlightLink("PERFORMANCE_RESULT", "res-5"),
    "/admin/performance/results?highlight=res-5",
  );
});

test("URL-encodes the resource id", () => {
  assert.equal(
    resourceHighlightLink("PROGRAM", "a b&c"),
    "/admin/programs?highlight=a%20b%26c",
  );
});

test("returns undefined for unmapped types or missing values", () => {
  assert.equal(resourceHighlightLink("AUDIT_LOG", "log-1"), undefined);
  assert.equal(resourceHighlightLink("PERFORMANCE_EVIDENCE", "ev-1"), undefined);
  assert.equal(resourceHighlightLink(null, "x"), undefined);
  assert.equal(resourceHighlightLink("PROGRAM", null), undefined);
  assert.equal(resourceHighlightLink("PROGRAM", ""), undefined);
});
