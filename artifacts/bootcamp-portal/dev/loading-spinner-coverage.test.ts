/**
 * Meta-test: keeps loading-state coverage in sync with the pages that exist.
 *
 * TESTING.md rule: every data-driven page (one that fires a query on mount
 * via useQuery) must have loading-state tests in
 * dev/loading-spinner-states.test.ts (LoadingCard or Skeleton shown while
 * loading, hidden once loaded). Nothing enforced that automatically — a new
 * page could ship with zero loading coverage. This test scans src/pages/
 * for pages that use useQuery and fails if any of them is never referenced
 * by the loading-state test file.
 *
 * Pages without on-mount queries are excluded via EXCLUDED_PAGES below.
 * If you add a page there, leave a reason — and if the page later gains an
 * on-mount useQuery, remove it from the list and add a real loading test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
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

test("every data-driven page has a loading-state test (TESTING.md rule)", () => {
  // Pages that use useQuery (i.e. fetch data on mount).
  const dataDrivenPages = walk(PAGES_DIR)
    .map((f) => relative(PAGES_DIR, f).split("\\").join("/"))
    .filter((rel) => !EXCLUDED_PAGES.has(rel))
    .filter((rel) => /\buseQuery\s*[(<]/.test(readFileSync(join(PAGES_DIR, rel), "utf8")));

  assert.ok(
    dataDrivenPages.length > 0,
    "expected to find data-driven pages under src/pages/ — did the directory move?",
  );

  // Content of the loading-state test file. A page counts as covered when
  // its src/pages/... path appears in it (in its import statement).
  const loadingTestPath = join(DEV_DIR, "loading-spinner-states.test.ts");
  assert.ok(
    existsSync(loadingTestPath),
    "expected dev/loading-spinner-states.test.ts to exist",
  );
  const loadingTestContent = readFileSync(loadingTestPath, "utf8");

  const uncovered = dataDrivenPages.filter(
    (rel) => !loadingTestContent.includes(`src/pages/${rel}`),
  );

  assert.deepEqual(
    uncovered,
    [],
    `These data-driven pages (useQuery on mount) have no loading-state test in dev/loading-spinner-states.test.ts.\n` +
      `Add a loading-state + loaded-state test asserting a LoadingCard message (or Skeleton rows) while the\n` +
      `on-mount query is in flight and gone once data resolves (see dev/TESTING.md), or add the page to\n` +
      `EXCLUDED_PAGES in dev/excluded-pages.ts if it genuinely has no on-mount query:\n  - ${uncovered.join("\n  - ")}`,
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
