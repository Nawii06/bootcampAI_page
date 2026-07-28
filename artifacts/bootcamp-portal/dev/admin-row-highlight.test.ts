/**
 * Page-level tests for ?highlight= deep-link support on admin lists beyond
 * /admin/partners: audit logs, applications, and programs.
 *
 * Mirrors dev/company-row-highlight.test.ts: each page is mounted with
 * ?highlight=<id> in the URL; the test asserts the param is stripped via
 * history.replaceState (other params preserved) and the target row renders
 * with the DataTable highlight classes. React Query caches are pre-populated
 * (setQueryData + refetchOnMount:false) so no network fetch fires.
 *
 * DOM environment: happy-dom (setup-dom.ts). happy-dom's HTMLElement has no
 * scrollIntoView, so a no-op stub is installed before rendering.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, cleanup, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthContext,
  type AuthContextType,
} from "../src/contexts/AuthContext.tsx";
import AdminAuditLogs from "../src/pages/admin/audit-logs.tsx";
import AdminApplications from "../src/pages/admin/applications.tsx";
import AdminPrograms from "../src/pages/admin/programs.tsx";

// Vite replaces __FAKE_DATA_SET__ at build time; define it before any render.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// happy-dom elements don't implement scrollIntoView; DataTable calls it on
// the highlighted row, so stub it.
(window.HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView =
  function () {};

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

function renderPage(page: () => React.ReactNode, qc: QueryClient) {
  return render(
    createElement(
      AuthContext.Provider,
      { value: MOCK_AUTH },
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(page as React.FC),
      ),
    ),
  );
}

/** Find the <tr> element containing the given text. */
function findRow(text: string): HTMLElement {
  const cell = screen.getByText(text);
  const tr = cell.closest("tr");
  assert.ok(tr, `row containing "${text}" must exist`);
  return tr as unknown as HTMLElement;
}

function assertUrlStripped(pathname: string) {
  const params = new URLSearchParams(window.location.search);
  assert.equal(
    params.get("highlight"),
    null,
    "?highlight= must be stripped from the URL after mount",
  );
  assert.equal(params.get("tab"), "all", "other query params must be preserved");
  assert.equal(window.location.pathname, pathname, "pathname must be unchanged");
}

// ─── Audit logs ──────────────────────────────────────────────────────────────

// Mirror the page's default filter computation so the pre-populated cache
// matches the queryKey the page builds on mount.
function dateInput(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
function asRange(startDate: string, endDate: string) {
  return {
    startAt: new Date(`${startDate}T00:00:00`).toISOString(),
    endAt: new Date(`${endDate}T23:59:59.999`).toISOString(),
  };
}

const LOG_ID = "00000000-0000-0000-0000-0000000000a1";

const LOG_ROW = {
  id: LOG_ID,
  occurredAt: "2026-07-20T09:00:00.000Z",
  actorDisplayName: "감사 대상자",
  action: "UPDATE",
  resourceType: "COMPANY",
  resourceId: "res-1",
  requestId: "req-1",
  ipAddress: null,
};

function infinitePage(items: unknown[]) {
  return {
    pages: [{ page: 1, items, total: items.length, hasMore: false }],
    pageParams: [1],
  };
}

test("AdminAuditLogs — ?highlight= strips from URL and highlights the log row", () => {
  window.history.replaceState(
    null,
    "",
    `/admin/audit-logs?highlight=${LOG_ID}&tab=all`,
  );
  const qc = makeQueryClient();
  const filters = { ...asRange(dateInput(7), dateInput(0)), action: "", resourceType: "" };
  qc.setQueryData(["audit-logs", filters], infinitePage([LOG_ROW]));
  qc.setQueryData(["audit-logs", "share-token", ""], infinitePage([]));

  try {
    renderPage(AdminAuditLogs, qc);

    assertUrlStripped("/admin/audit-logs");
    const row = findRow("감사 대상자");
    assert.match(
      row.className,
      /bg-primary\/10/,
      "target audit-log row must be highlighted",
    );
  } finally {
    cleanup();
    qc.clear();
    window.history.replaceState(null, "", "/");
  }
});

// ─── Applications ────────────────────────────────────────────────────────────

const APPLICATION_ID = "00000000-0000-0000-0000-0000000000b1";

const MOCK_APPLICATIONS = {
  data: [
    {
      id: APPLICATION_ID,
      programName: "AI 부트캠프",
      sessionName: "1회차",
      studentId: "stu-1",
      status: "SUBMITTED",
    },
  ],
};

test("AdminApplications — ?highlight= strips from URL and highlights the application row", () => {
  window.history.replaceState(
    null,
    "",
    `/admin/applications?highlight=${APPLICATION_ID}&tab=all`,
  );
  const qc = makeQueryClient();
  qc.setQueryData(["admin", "program-applications"], MOCK_APPLICATIONS);

  try {
    renderPage(AdminApplications, qc);

    assertUrlStripped("/admin/applications");
    const row = findRow("AI 부트캠프");
    assert.match(
      row.className,
      /bg-primary\/10/,
      "target application row must be highlighted",
    );
  } finally {
    cleanup();
    qc.clear();
    window.history.replaceState(null, "", "/");
  }
});

// ─── Programs ────────────────────────────────────────────────────────────────

const PROGRAM_ID = "00000000-0000-0000-0000-0000000000d1";

const MOCK_PROGRAMS = {
  data: [
    {
      id: PROGRAM_ID,
      code: "PRG-001",
      name: "하이라이트 프로그램",
      description: null,
      programType: "BOOTCAMP",
      status: "DRAFT",
      eligibilityRules: {},
      completionRules: {},
      programSessions: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

test("AdminPrograms — ?highlight= strips from URL and highlights the program row", () => {
  window.history.replaceState(
    null,
    "",
    `/admin/programs?highlight=${PROGRAM_ID}&tab=all`,
  );
  const qc = makeQueryClient();
  qc.setQueryData(["admin", "programs"], MOCK_PROGRAMS);

  try {
    renderPage(AdminPrograms, qc);

    assertUrlStripped("/admin/programs");
    const row = findRow("하이라이트 프로그램");
    assert.match(
      row.className,
      /bg-primary\/10/,
      "target program row must be highlighted",
    );
  } finally {
    cleanup();
    qc.clear();
    window.history.replaceState(null, "", "/");
  }
});
