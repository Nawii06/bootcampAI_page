/**
 * Tests for the /admin/partners company-row highlight behaviour.
 *
 *  1. DataTable-level: a row rendered with highlightId gets the highlight
 *     classes (bg-primary/10 + ring), and after the ~3 s fade delay the
 *     classes are removed. Timers are driven with Node's mock timers.
 *
 *  2. Page-level: mounting AdminPartners with ?highlight=<id> in the URL
 *     strips the highlight param via history.replaceState, so a refresh or
 *     shared link doesn't re-highlight. React Query caches are pre-populated
 *     (setQueryData + refetchOnMount:false) so no network fetch fires —
 *     same isolation strategy as page-loading-states.test.ts.
 *
 * DOM environment: happy-dom (setup-dom.ts). happy-dom's HTMLElement has no
 * scrollIntoView, so a no-op stub is installed before rendering.
 */
import test from "node:test";
import { mock } from "node:test";
import assert from "node:assert/strict";
import { act } from "react";
import { createElement } from "react";
import { render, cleanup, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataTable, type ColumnDef } from "../src/components/DataTable.tsx";
import {
  AuthContext,
  type AuthContextType,
} from "../src/contexts/AuthContext.tsx";
import AdminPartners from "../src/pages/admin/partners.tsx";

// Vite replaces __FAKE_DATA_SET__ at build time; define it before any render.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// happy-dom elements don't implement scrollIntoView; DataTable calls it on
// the highlighted row, so stub it (and record calls for assertions).
const scrollCalls: unknown[] = [];
(window.HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView =
  function (...args: unknown[]) {
    scrollCalls.push(args);
  };

// DataTable schedules its fade with `window.setTimeout` (happy-dom's own
// clock), but Node's mock.timers only patches the globalThis timer functions.
// Delegate window's timers to globalThis so mock.timers.tick() drives them.
function patchWindowTimers(): () => void {
  const w = window as unknown as Record<string, unknown>;
  const origSet = w.setTimeout;
  const origClear = w.clearTimeout;
  w.setTimeout = (...args: unknown[]) =>
    (globalThis.setTimeout as (...a: unknown[]) => unknown)(...args);
  w.clearTimeout = (...args: unknown[]) =>
    (globalThis.clearTimeout as (...a: unknown[]) => unknown)(...args);
  return () => {
    w.setTimeout = origSet;
    w.clearTimeout = origClear;
  };
}

// ─── Mock auth (admin) ───────────────────────────────────────────────────────

const MOCK_AUTH: AuthContextType = {
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "테스트 관리자",
    role: "admin",
    roles: ["ADMIN"],
    loginId: "admin@example.com",
    defaultRoute: "/admin/dashboard",
  } as AuthContextType["user"],
  isLoading: false,
  refreshSession: async () => null,
  loginWithFakeIdentity: async () => { throw new Error("not available in tests"); },
  logout: async () => {},
  hasPermission: () => true,
};

// ─── Mock data ───────────────────────────────────────────────────────────────

const COMPANY_ID = "00000000-0000-0000-0000-0000000000c1";

interface Row { id: string; name: string }

const ROWS: Row[] = [
  { id: "row-a", name: "가나다 주식회사" },
  { id: "row-b", name: "하이라이트 대상" },
];

const COLUMNS: ColumnDef<Row>[] = [{ key: "name", header: "기업명" }];

const MOCK_COMPANIES = {
  data: [
    {
      id: COMPANY_ID,
      name: "하이라이트 기업",
      companyType: "LARGE",
      registrationNumber: "123-45-67890",
      description: null,
      website: null,
      isActive: true,
      isPublic: false,
      companyContacts: [],
      companyExperts: [],
      companyParticipations: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const MOCK_APPLICATIONS = { data: [], commitments: [] };

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

/** Find the <tr> element containing the given row text. */
function findRow(text: string): HTMLElement {
  const cell = screen.getByText(text);
  const tr = cell.closest("tr");
  assert.ok(tr, `row containing "${text}" must exist`);
  return tr as unknown as HTMLElement;
}

// ─── DataTable: highlight fades out after the delay ─────────────────────────

test("DataTable — highlighted row shows ring classes, then fades after 3 s", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const restoreTimers = patchWindowTimers();
  try {
    render(
      createElement(DataTable<Row>, {
        data: ROWS,
        columns: COLUMNS,
        highlightId: "row-b",
      }),
    );

    const highlighted = findRow("하이라이트 대상");
    assert.match(
      highlighted.className,
      /bg-primary\/10/,
      "highlighted row must have the highlight background class on mount",
    );
    assert.match(
      highlighted.className,
      /ring-primary\/40/,
      "highlighted row must have the ring class on mount",
    );
    assert.equal(scrollCalls.length, 1, "row must be scrolled into view once");

    // Non-highlighted row never gets the classes.
    const other = findRow("가나다 주식회사");
    assert.doesNotMatch(other.className, /bg-primary\/10/);

    // Advance past the 3-second fade delay.
    act(() => {
      mock.timers.tick(3000);
    });

    const afterFade = findRow("하이라이트 대상");
    assert.doesNotMatch(
      afterFade.className,
      /bg-primary\/10/,
      "highlight background must be removed after the fade delay",
    );
    assert.doesNotMatch(
      afterFade.className,
      /ring-primary\/40/,
      "highlight ring must be removed after the fade delay",
    );
  } finally {
    cleanup();
    restoreTimers();
    mock.timers.reset();
  }
});

// ─── DataTable: highlight not removed BEFORE the delay ──────────────────────

test("DataTable — highlight persists just before the 3 s delay elapses", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const restoreTimers = patchWindowTimers();
  try {
    render(
      createElement(DataTable<Row>, {
        data: ROWS,
        columns: COLUMNS,
        highlightId: "row-b",
      }),
    );

    act(() => {
      mock.timers.tick(2999);
    });
    assert.match(
      findRow("하이라이트 대상").className,
      /bg-primary\/10/,
      "highlight must still be visible at 2999 ms",
    );

    act(() => {
      mock.timers.tick(1);
    });
    assert.doesNotMatch(
      findRow("하이라이트 대상").className,
      /bg-primary\/10/,
      "highlight must be gone at exactly 3000 ms",
    );
  } finally {
    cleanup();
    restoreTimers();
    mock.timers.reset();
  }
});

// ─── Page: ?highlight= param stripped from the URL on mount ─────────────────

test("AdminPartners — ?highlight= query param is removed from the URL after mount", () => {
  // Navigate to the page with a highlight param (plus another param that
  // must survive the rewrite).
  window.history.replaceState(
    null,
    "",
    `/admin/partners?highlight=${COMPANY_ID}&tab=companies`,
  );

  const qc = makeQueryClient();
  qc.setQueryData(["admin", "companies"], MOCK_COMPANIES);
  qc.setQueryData(["admin", "company-applications"], MOCK_APPLICATIONS);

  try {
    render(
      createElement(
        AuthContext.Provider,
        { value: MOCK_AUTH },
        createElement(
          QueryClientProvider,
          { client: qc },
          createElement(AdminPartners),
        ),
      ),
    );

    const params = new URLSearchParams(window.location.search);
    assert.equal(
      params.get("highlight"),
      null,
      "?highlight= must be stripped from the URL after mount",
    );
    assert.equal(
      params.get("tab"),
      "companies",
      "other query params must be preserved",
    );
    assert.equal(
      window.location.pathname,
      "/admin/partners",
      "pathname must be unchanged",
    );

    // The highlighted company row still renders (highlight state was captured
    // before the URL rewrite).
    assert.ok(screen.getByText("하이라이트 기업"));
  } finally {
    cleanup();
    qc.clear();
    window.history.replaceState(null, "", "/");
  }
});
