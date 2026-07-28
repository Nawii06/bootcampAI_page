/**
 * Meta-test: keeps error-state coverage in sync with the pages that exist.
 *
 * TESTING.md rule: every data-driven page (one that fires a query on mount
 * via useQuery) must have an error-state test in one of the
 * dev/error-states-*.test.ts files. Nothing enforced that automatically —
 * a new page could ship with zero error coverage. This test scans
 * src/pages/ for pages that use useQuery and fails if any of them is never
 * referenced by an error-states test file.
 *
 * Pages without on-mount queries are excluded via EXCLUDED_PAGES below.
 * If you add a page there, leave a reason — and if the page later gains an
 * on-mount useQuery, remove it from the list and add a real error test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCLUDED_PAGES } from "./excluded-pages";

const DEV_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(DEV_DIR, "..");
const PAGES_DIR = join(ROOT, "src", "pages");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("every data-driven page has an error-state test (TESTING.md rule)", () => {
  // Pages that use useQuery (i.e. fetch data on mount).
  const dataDrivenPages = walk(PAGES_DIR)
    .map((f) => relative(PAGES_DIR, f).split("\\").join("/"))
    .filter((rel) => !EXCLUDED_PAGES.has(rel))
    .filter((rel) => /\buseQuery\s*[(<]/.test(readFileSync(join(PAGES_DIR, rel), "utf8")));

  assert.ok(
    dataDrivenPages.length > 0,
    "expected to find data-driven pages under src/pages/ — did the directory move?",
  );

  // All content of the error-states test files, concatenated. A page counts
  // as covered when its src/pages/... path appears in one of them (either
  // in an import statement or in the coverage header comment).
  const errorTestFiles = readdirSync(DEV_DIR).filter(
    (f) => f.startsWith("error-states-") && f.endsWith(".test.ts") && f !== "error-states-coverage.test.ts",
  );
  assert.ok(
    errorTestFiles.length > 0,
    "expected dev/error-states-*.test.ts files to exist",
  );
  const errorTestContent = errorTestFiles
    .map((f) => readFileSync(join(DEV_DIR, f), "utf8"))
    .join("\n");

  const uncovered = dataDrivenPages.filter(
    (rel) => !errorTestContent.includes(`src/pages/${rel}`),
  );

  assert.deepEqual(
    uncovered,
    [],
    `These data-driven pages (useQuery on mount) have no error-state test in dev/error-states-*.test.ts.\n` +
      `Add a test asserting an ErrorCard message + "다시 시도" retry button when the on-mount query fails\n` +
      `(see dev/TESTING.md), or add the page to EXCLUDED_PAGES in dev/excluded-pages.ts if it\n` +
      `genuinely has no on-mount query:\n  - ${uncovered.join("\n  - ")}`,
  );

  // Guard the exclusion list itself: entries must still exist as pages.
  const allPages = new Set(walk(PAGES_DIR).map((f) => relative(PAGES_DIR, f).split("\\").join("/")));
  const stale = [...EXCLUDED_PAGES].filter((p) => !allPages.has(p));
  assert.deepEqual(
    stale,
    [],
    `EXCLUDED_PAGES entries no longer exist under src/pages/ — remove them: ${stale.join(", ")}`,
  );
});
