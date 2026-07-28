/**
 * "No active business year" notices on admin screens.
 *
 * The admin screens below gate their content on the active business-years
 * query (queryKey ["reference", "business-years", "active"]). They are not
 * submission forms, but with zero active years they would otherwise render
 * empty charts/tables with no explanation. Each must show the shared
 * role="status" notice (src/components/NoActiveYearNotice.tsx) when the
 * query succeeds with ZERO years, and must NOT show it when an active year
 * exists.
 *
 * Pages covered (referenced by dev/no-open-period-coverage.test.ts):
 *   - src/pages/admin/dashboard.tsx
 *   - src/pages/admin/budget.tsx
 *   - src/pages/admin/evaluation.tsx
 *   - src/pages/admin/performance-dashboard.tsx
 *   - src/pages/admin/performance-export.tsx
 *   - src/pages/admin/performance-indicators.tsx
 *   - src/pages/admin/performance-results.tsx
 *   - src/pages/admin/performance-source-data.tsx
 *
 * Pattern follows dev/TESTING.md: AuthContext.Provider injection (no
 * mock.module()), setQueryData pre-populates every query so no fetch runs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ComponentType } from "react";
import { screen } from "@testing-library/react";

import { AUTH_ADMIN, renderPage, withCleanup } from "./page-test-utils.ts";
import AdminDashboard from "../src/pages/admin/dashboard.tsx";
import AdminBudget from "../src/pages/admin/budget.tsx";
import AdminEvaluation from "../src/pages/admin/evaluation.tsx";
import AdminPerformanceDashboard from "../src/pages/admin/performance-dashboard.tsx";
import AdminPerformanceExport from "../src/pages/admin/performance-export.tsx";
import AdminPerformanceIndicators from "../src/pages/admin/performance-indicators.tsx";
import AdminPerformanceResults from "../src/pages/admin/performance-results.tsx";
import AdminPerformanceSourceData from "../src/pages/admin/performance-source-data.tsx";

const NOTICE = "현재 운영 중인 사업연도가 없습니다";

const YEARS_KEY = ["reference", "business-years", "active"];
const NO_YEARS = { queryKey: YEARS_KEY, data: { data: [] } };
const ONE_YEAR = {
  queryKey: YEARS_KEY,
  data: { data: [{ id: "year-1", name: "2026년 사업연도", year: 2026 }] },
};

const EMPTY_LIST = { data: [] as unknown[] };
const EMPTY_OVERVIEW = {
  indicators: [],
  targets: [],
  results: [],
  evidence: [],
};
const EMPTY_BUDGET_SUMMARY = {
  allocated: 0,
  planned: 0,
  executed: 0,
  balance: 0,
  executionRate: 0,
};

type Entry = { queryKey: unknown[]; data: unknown };

interface PageCase {
  name: string;
  Page: ComponentType;
  /** Queries that run regardless of the active year. */
  alwaysData?: Entry[];
  /** Year-scoped queries, pre-populated only in the ONE_YEAR scenario. */
  yearData?: Entry[];
}

const CASES: PageCase[] = [
  {
    name: "AdminDashboard",
    Page: AdminDashboard,
    alwaysData: [
      { queryKey: ["admin", "program-applications"], data: EMPTY_LIST },
    ],
    yearData: [
      { queryKey: ["admin", "programs", "year-1"], data: EMPTY_LIST },
      { queryKey: ["admin", "completion-assessments", "year-1"], data: EMPTY_LIST },
      { queryKey: ["admin", "budget-summary", "year-1"], data: EMPTY_BUDGET_SUMMARY },
    ],
  },
  {
    name: "AdminBudget",
    Page: AdminBudget,
    alwaysData: [
      { queryKey: ["admin", "files", "budget-picker"], data: EMPTY_LIST },
    ],
    yearData: [
      { queryKey: ["admin", "budget-summary", "year-1"], data: EMPTY_BUDGET_SUMMARY },
      { queryKey: ["admin", "budget-operations", "year-1"], data: { allocations: [], executions: [] } },
    ],
  },
  {
    name: "AdminEvaluation",
    Page: AdminEvaluation,
    yearData: [
      { queryKey: ["performance", "reviews", "year-1"], data: EMPTY_LIST },
    ],
  },
  {
    name: "AdminPerformanceDashboard",
    Page: AdminPerformanceDashboard,
    yearData: [
      { queryKey: ["performance", "overview", "year-1"], data: EMPTY_OVERVIEW },
    ],
  },
  {
    name: "AdminPerformanceExport",
    Page: AdminPerformanceExport,
    yearData: [
      { queryKey: ["performance", "overview", "year-1"], data: EMPTY_OVERVIEW },
    ],
  },
  {
    name: "AdminPerformanceIndicators",
    Page: AdminPerformanceIndicators,
    yearData: [
      { queryKey: ["performance", "overview", "year-1"], data: EMPTY_OVERVIEW },
    ],
  },
  {
    name: "AdminPerformanceResults",
    Page: AdminPerformanceResults,
    alwaysData: [
      { queryKey: ["admin", "stored-files", "performance-result-link"], data: EMPTY_LIST },
    ],
    yearData: [
      { queryKey: ["performance", "overview", "year-1"], data: EMPTY_OVERVIEW },
    ],
  },
  {
    name: "AdminPerformanceSourceData",
    Page: AdminPerformanceSourceData,
    yearData: [
      { queryKey: ["performance", "source-summary", "year-1"], data: EMPTY_LIST },
    ],
  },
];

for (const { name, Page, alwaysData = [], yearData = [] } of CASES) {
  test(
    `${name} — zero active years shows the role=status notice`,
    withCleanup(() => {
      renderPage(createElement(Page), {
        auth: AUTH_ADMIN,
        queryData: [NO_YEARS, ...alwaysData],
      });
      const notice = screen
        .queryAllByRole("status")
        .find((el) => el.textContent?.includes(NOTICE));
      assert.ok(
        notice,
        `${name} should show a role=status notice explaining there is no active business year`,
      );
    }),
  );

  test(
    `${name} — active year hides the no-active-year notice`,
    withCleanup(() => {
      renderPage(createElement(Page), {
        auth: AUTH_ADMIN,
        queryData: [ONE_YEAR, ...alwaysData, ...yearData],
      });
      assert.equal(
        screen.queryAllByText(NOTICE, { exact: false }).length,
        0,
        `${name} must NOT show the notice when an active year exists`,
      );
    }),
  );
}
