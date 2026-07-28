/**
 * Meta-test: no submission page may ship with only a silently disabled
 * submit button when there is no open business year.
 *
 * Rule (see dev/TESTING.md): every page that gates submission on the
 * active business-years query — queryKey ["reference", "business-years",
 * "active"] / GET /api/v1/reference/business-years?active=true — must show
 * an explicit role="status" "no open period" notice when that query
 * returns zero years, and that behaviour must be locked in by a test in
 * one of the notice test files listed in NOTICE_TEST_FILES below.
 *
 * This test scans src/pages/ for the active business-years query key and
 * fails when a page using it is not referenced by any notice test file
 * and not consciously excluded in EXCLUDED_PAGES (with a reason).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DEV_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(DEV_DIR, "..");
const PAGES_DIR = join(ROOT, "src", "pages");

/** Test files that lock in the no-open-period notice pattern. */
const NOTICE_TEST_FILES = [
  "no-open-period-notices.test.ts",
  "no-open-period-admin-notices.test.ts",
  "project-empty-state.test.ts",
  "survey-empty-state.test.ts",
];

/**
 * Pages that use the active business-years query but are NOT submission
 * forms — admin read/reporting screens where a missing active year does
 * not silently disable a user-facing submit button. Paths are relative to
 * src/pages/. If one of these later gains a year-gated submission form,
 * remove it here and add a notice + test instead.
 */
const EXCLUDED_PAGES = new Map<string, string>([
  ["admin/course-imports.tsx", "admin import tooling — fetches active years inside mutations, no submission form"],
]);

// Matches the query key or the raw endpoint, so pages that inline the
// fetch (without useQuery) are still caught.
const ACTIVE_YEARS_PATTERNS = [
  /["'`]business-years["'`]\s*,\s*["'`]active["'`]/,
  /business-years\?active=true/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("every year-gated submission page has a no-open-period notice test (TESTING.md rule)", () => {
  const gatedPages = walk(PAGES_DIR)
    .map((f) => relative(PAGES_DIR, f).split("\\").join("/"))
    .filter((rel) =>
      ACTIVE_YEARS_PATTERNS.some((re) =>
        re.test(readFileSync(join(PAGES_DIR, rel), "utf8")),
      ),
    );

  assert.ok(
    gatedPages.length > 0,
    "expected pages using the active business-years query under src/pages/ — did the query key change? Update ACTIVE_YEARS_PATTERNS.",
  );

  // Stale exclusions: entries for pages that no longer use the query (or
  // no longer exist) must be pruned so the list stays trustworthy.
  const staleExclusions = [...EXCLUDED_PAGES.keys()].filter(
    (rel) => !gatedPages.includes(rel),
  );
  assert.deepEqual(
    staleExclusions,
    [],
    "These EXCLUDED_PAGES entries no longer match a page using the active business-years query — remove them.",
  );

  const noticeTestContent = NOTICE_TEST_FILES.map((f) =>
    readFileSync(join(DEV_DIR, f), "utf8"),
  ).join("\n");

  const uncovered = gatedPages
    .filter((rel) => !EXCLUDED_PAGES.has(rel))
    .filter((rel) => !noticeTestContent.includes(`src/pages/${rel}`));

  assert.deepEqual(
    uncovered,
    [],
    `These pages gate on the active business-years query but have no no-open-period notice test.\n` +
      `A submission page must show a role="status" notice when zero active years are returned —\n` +
      `never just a disabled submit button. Add tests to dev/no-open-period-notices.test.ts\n` +
      `(see dev/TESTING.md), or — for admin non-submission screens only — add the page to\n` +
      `EXCLUDED_PAGES in dev/no-open-period-coverage.test.ts with a reason.`,
  );
});
