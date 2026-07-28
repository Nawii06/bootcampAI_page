/**
 * Page-level tests for ?highlight= deep-link support on the remaining
 * DataTable pages: budget-log, completion, evidence, the performance-* pages,
 * and student/status.
 *
 * Mirrors dev/admin-row-highlight.test.ts: each page is mounted with
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
import AdminBudgetLog from "../src/pages/admin/budget-log.tsx";
import AdminCompletion from "../src/pages/admin/completion.tsx";
import AdminEvidence from "../src/pages/admin/evidence.tsx";
import AdminPerformanceDashboard from "../src/pages/admin/performance-dashboard.tsx";
import AdminPerformanceEvidence from "../src/pages/admin/performance-evidence.tsx";
import AdminPerformanceIndicators from "../src/pages/admin/performance-indicators.tsx";
import AdminPerformanceResults from "../src/pages/admin/performance-results.tsx";
import AdminPerformanceSourceData from "../src/pages/admin/performance-source-data.tsx";
import StudentStatus from "../src/pages/student/status.tsx";

// Vite replaces __FAKE_DATA_SET__ at build time; define it before any render.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// happy-dom elements don't implement scrollIntoView; DataTable calls it on
// the highlighted row, so stub it.
(window.HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView =
  function () {};

// Radix primitives require ResizeObserver, which happy-dom lacks.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// ─── Mock auth ───────────────────────────────────────────────────────────────

const USER_ID = "00000000-0000-0000-0000-000000000001";

function makeAuth(role: "admin" | "student", roles: string[]): AuthContextType {
  return {
    user: {
      id: USER_ID,
      name: "테스트 사용자",
      role,
      roles,
      loginId: `${role}@example.com`,
      defaultRoute: role === "admin" ? "/admin/dashboard" : "/student/status",
    } as AuthContextType["user"],
    isLoading: false,
    refreshSession: async () => null,
    loginWithFakeIdentity: async () => {
      throw new Error("not available in tests");
    },
    logout: async () => {},
    hasPermission: () => true,
  };
}

const MOCK_ADMIN = makeAuth("admin", ["ADMIN"]);
const MOCK_STUDENT = makeAuth("student", ["STUDENT"]);

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

function renderPage(
  page: () => React.ReactNode,
  qc: QueryClient,
  auth: AuthContextType = MOCK_ADMIN,
) {
  return render(
    createElement(
      AuthContext.Provider,
      { value: auth },
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

interface Case {
  name: string;
  path: string;
  page: () => React.ReactNode;
  auth?: AuthContextType;
  rowId: string;
  rowText: string;
  seed: (qc: QueryClient) => void;
}

function runCase(c: Case) {
  test(`${c.name} — ?highlight= strips from URL and highlights the row`, () => {
    window.history.replaceState(null, "", `${c.path}?highlight=${c.rowId}&tab=all`);
    const qc = makeQueryClient();
    c.seed(qc);
    try {
      renderPage(c.page, qc, c.auth);
      assertUrlStripped(c.path);
      const row = findRow(c.rowText);
      assert.match(
        row.className,
        /bg-primary\/10/,
        `target row on ${c.path} must be highlighted`,
      );
    } finally {
      cleanup();
      qc.clear();
      window.history.replaceState(null, "", "/");
    }
  });
}

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const YEAR_ID = "00000000-0000-0000-0000-0000000000y1";
const YEARS = { data: [{ id: YEAR_ID, name: "2026년" }] };
const INDICATOR_ID = "00000000-0000-0000-0000-0000000000i1";
const RESULT_ID = "00000000-0000-0000-0000-0000000000r1";
const OVERVIEW = {
  indicators: [
    {
      id: INDICATOR_ID,
      code: "IND-001",
      name: "하이라이트 지표",
      category: "취업",
      unit: "%",
    },
  ],
  targets: [],
  results: [
    {
      id: RESULT_ID,
      indicatorId: INDICATOR_ID,
      actualValue: "42",
      status: "DRAFT",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ],
  evidence: [],
};

const FILE_ID = "00000000-0000-0000-0000-0000000000f1";
const STORED_FILES = {
  data: [
    {
      id: FILE_ID,
      originalName: "하이라이트-증빙.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      containsPersonalInfo: false,
      isPublic: false,
      uploadedByName: "관리자",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ],
};

// ─── Cases ───────────────────────────────────────────────────────────────────

const BUDGET_ID = "00000000-0000-0000-0000-0000000000e1";
runCase({
  name: "AdminBudgetLog",
  path: "/admin/budget-log",
  page: AdminBudgetLog,
  rowId: BUDGET_ID,
  rowText: "하이라이트 변경사유",
  seed: (qc) =>
    qc.setQueryData(["admin", "budget-change-history"], {
      data: [
        {
          id: BUDGET_ID,
          changedAt: "2026-07-01T00:00:00.000Z",
          budgetCode: "B-001",
          category: "운영비",
          fieldName: "allocatedAmount",
          previousAmount: "1000",
          newAmount: "2000",
          reason: "하이라이트 변경사유",
          changedByName: "관리자",
        },
      ],
    }),
});

const COMPLETION_ID = "00000000-0000-0000-0000-0000000000c1";
runCase({
  name: "AdminCompletion",
  path: "/admin/completion",
  page: AdminCompletion,
  rowId: COMPLETION_ID,
  rowText: "하이라이트 학생",
  seed: (qc) =>
    qc.setQueryData(["admin", "completion-assessments"], {
      data: [
        {
          id: COMPLETION_ID,
          studentNumber: "20260001",
          studentName: "하이라이트 학생",
          curriculumName: "AI 과정",
          progressRate: "80",
          missing: [],
          completed: false,
          calculatedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
    }),
});

runCase({
  name: "AdminEvidence",
  path: "/admin/evidence",
  page: AdminEvidence,
  rowId: FILE_ID,
  // The file name also appears in the relationship list below the table,
  // so match a cell that only exists in the DataTable.
  rowText: "application/pdf",
  seed: (qc) => qc.setQueryData(["admin", "stored-files"], STORED_FILES),
});

runCase({
  name: "AdminPerformanceDashboard",
  path: "/admin/performance-dashboard",
  page: AdminPerformanceDashboard,
  rowId: INDICATOR_ID,
  rowText: "하이라이트 지표",
  seed: (qc) => {
    qc.setQueryData(["reference", "business-years", "active"], YEARS);
    qc.setQueryData(["performance", "overview", YEAR_ID], OVERVIEW);
  },
});

runCase({
  name: "AdminPerformanceEvidence",
  path: "/admin/performance-evidence",
  page: AdminPerformanceEvidence,
  rowId: FILE_ID,
  rowText: "하이라이트-증빙.pdf",
  seed: (qc) => qc.setQueryData(["admin", "stored-files"], STORED_FILES),
});

runCase({
  name: "AdminPerformanceIndicators",
  path: "/admin/performance-indicators",
  page: AdminPerformanceIndicators,
  rowId: INDICATOR_ID,
  rowText: "하이라이트 지표",
  seed: (qc) => {
    qc.setQueryData(["reference", "business-years", "active"], YEARS);
    qc.setQueryData(["performance", "overview", YEAR_ID], OVERVIEW);
  },
});

runCase({
  name: "AdminPerformanceResults",
  path: "/admin/performance-results",
  page: AdminPerformanceResults,
  rowId: RESULT_ID,
  rowText: "하이라이트 지표",
  seed: (qc) => {
    qc.setQueryData(["reference", "business-years", "active"], YEARS);
    qc.setQueryData(["performance", "overview", YEAR_ID], OVERVIEW);
  },
});

const SOURCE_ID = "00000000-0000-0000-0000-0000000000s1";
runCase({
  name: "AdminPerformanceSourceData",
  path: "/admin/performance-source-data",
  page: AdminPerformanceSourceData,
  rowId: SOURCE_ID,
  rowText: "하이라이트 도메인",
  seed: (qc) => {
    qc.setQueryData(["reference", "business-years", "active"], YEARS);
    qc.setQueryData(["performance", "source-summary", YEAR_ID], {
      data: [
        {
          id: SOURCE_ID,
          domain: "하이라이트 도메인",
          table: "students",
          count: 12,
          yearScoped: true,
        },
      ],
    });
  },
});

const APPLICATION_ID = "00000000-0000-0000-0000-0000000000a1";
runCase({
  name: "StudentStatus",
  path: "/student/status",
  page: StudentStatus,
  auth: MOCK_STUDENT,
  rowId: APPLICATION_ID,
  rowText: "하이라이트 프로그램",
  seed: (qc) => {
    qc.setQueryData(["program-applications", USER_ID], {
      data: [
        {
          id: APPLICATION_ID,
          programName: "하이라이트 프로그램",
          sessionName: "1회차",
          submittedAt: "2026-07-01T00:00:00.000Z",
          status: "SUBMITTED",
          reviewNote: null,
        },
      ],
    });
    qc.setQueryData(["student", "employment-links", USER_ID], { data: [] });
  },
});
