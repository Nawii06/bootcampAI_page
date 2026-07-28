# Testing guide — loading-state coverage for portal pages

**Rule: every new page added to the portal must get loading-state tests in
`dev/loading-spinner-states.test.ts` before it ships.** This file documents
the exact pattern so coverage stays consistent as the app grows.

Run the suite with:

```bash
pnpm --filter @workspace/bootcamp-portal run test
```

## Why this exists

`LoadingCard` (or a Skeleton) must appear while a page's queries are in
flight and disappear once data resolves. The tests that enforce this only
cover pages listed in `loading-spinner-states.test.ts` — a new page gets
zero coverage unless you add it there.

## Where things live

Shared helpers (fetch stubs, mock auth values, `renderPage`, the
`withLoadingCleanup` / `withErrorCleanup` / `withCleanup` wrappers and the
global DOM shims) are exported from `dev/page-test-utils.ts` — import them
instead of redefining. Error-state tests for pages live in the
`dev/error-states-*.test.ts` files, grouped by area (public/student,
partner, admin). Every data-driven page needs an error-state test asserting
an ErrorCard message plus a "다시 시도" retry button when its on-mount
query fails. This rule is enforced automatically:
`dev/error-states-coverage.test.ts` scans `src/pages/` for pages using
`useQuery` and fails if any of them is not referenced by an
`error-states-*.test.ts` file. Pages with no on-mount query are listed in
its `EXCLUDED_PAGES` set (with a reason).

## The pattern (3 techniques)

`mock.module()` is not available in this runtime, so the suite uses:

1. **Auth context injection** — wrap the page in
   `<AuthContext.Provider value={...}>` using the exported `AuthContext`
   from `src/contexts/AuthContext.tsx`. Ready-made values exist in the test
   file: `AUTH_LOADING`, `AUTH_ADMIN`, `AUTH_STUDENT`.
2. **Never-settling fetch stub for the loading state** — wrap the test body
   in `withLoadingCleanup(...)`. It installs a `fetch` stub whose Promises
   never settle (so every `useQuery` stays `isLoading: true`), then rejects
   them after `cleanup()` so the event loop can drain.
3. **`setQueryData` for the loaded state** — wrap the test body in
   `withCleanup(...)` and pass `queryData` to `renderPage(...)` to
   pre-populate the fresh per-test `QueryClient` cache, so the query reports
   `isLoading: false` without any network.

## Checklist for adding a new page

For each new page component:

- [ ] Statically import the page at the top of
      `dev/loading-spinner-states.test.ts` (no `mock.module()`).
- [ ] Add a **loading-state test** using `withLoadingCleanup`:
      render via `renderPage(createElement(NewPage), { auth: ... })` with
      the relevant query key(s) NOT pre-loaded, then assert the page's
      LoadingCard message (`screen.queryByText("...")`) — or, for
      Skeleton-based pages, assert `container.querySelectorAll(".animate-pulse").length > 0`.
- [ ] Add a **loaded-state test** using `withCleanup`:
      pass `queryData` entries whose `queryKey` values exactly match the
      page's `useQuery` keys (copy them from the page source), then assert
      the loading indicator is gone
      (`!screen.queryByText("...")` / zero `.animate-pulse` elements).
- [ ] If the page has multiple queries, pre-load ALL of them in the
      loaded-state test — one missing key keeps the page in loading state.
- [ ] Give the page's LoadingCard a **distinct Korean message** so
      assertions can't accidentally match another component's spinner.
- [ ] Run `pnpm --filter @workspace/bootcamp-portal run test` and confirm
      the new tests pass.

## Template

```ts
// ─── <NewPage> page ──────────────────────────────────────────────────────────
import NewPage from "../src/pages/<area>/<new-page>.tsx"; // at top of file

test(
  "NewPage — shows LoadingCard while <thing> query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(NewPage), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("<로딩 메시지>"),
      "NewPage should show LoadingCard while <thing> is loading",
    );
  }),
);

test(
  "NewPage — hides LoadingCard once <thing> is loaded",
  withCleanup(() => {
    renderPage(createElement(NewPage), {
      auth: AUTH_ADMIN,
      queryData: [{ queryKey: ["<exact>", "<query>", "<key>"], data: { data: [] } }],
    });
    assert.ok(
      !screen.queryByText("<로딩 메시지>"),
      "NewPage should hide LoadingCard once <thing> is loaded",
    );
  }),
);
```

## Gotchas

- Query keys must match the page's `useQuery` keys **exactly** (arrays are
  compared structurally) — copy them from the page source, don't guess.
- Pages behind interactions (e.g. a panel that opens on click): pre-load the
  queries needed to render the trigger, `fireEvent.click(...)` it, then
  assert on the panel's loading state (see the AdminContent tests).
- `withLoadingCleanup` restores the global `fetch` in its finally block —
  never install a fetch stub manually.
- Global DOM shims (`sessionStorage`, bare `addEventListener`, etc.) are
  handled once at the top of the test file; add new shims there if a new
  page needs one.
