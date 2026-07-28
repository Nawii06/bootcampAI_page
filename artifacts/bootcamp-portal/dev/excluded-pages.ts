/**
 * Shared exclusion list for the coverage meta-tests
 * (dev/error-states-coverage.test.ts and dev/loading-spinner-coverage.test.ts).
 *
 * Pages that intentionally have no error-state or loading-state test because
 * they do not fire a data query on mount. Paths are relative to src/pages/.
 * If you add a page here, leave a reason — and if the page later gains an
 * on-mount useQuery, remove it from the list and add real error + loading tests.
 */
export const EXCLUDED_PAGES = new Set<string>([
  "login.tsx", // form only — no on-mount query
  "not-found.tsx", // static 404 page
  "public/intro.tsx", // static content page
  "admin/course-imports.tsx", // mutation-only, no on-load query
]);
