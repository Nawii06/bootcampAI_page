/**
 * Error-state tests for admin pages (batch B).
 *
 * Covered pages:
 *   - src/pages/admin/kpi.tsx (alias of performance-dashboard — covered via dashboard)
 *   - src/pages/admin/partners.tsx
 *   - src/pages/admin/performance-dashboard.tsx
 *   - src/pages/admin/performance-evidence.tsx
 *   - src/pages/admin/performance-export.tsx
 *   - src/pages/admin/performance-indicators.tsx
 *   - src/pages/admin/performance-results.tsx
 *   - src/pages/admin/performance-source-data.tsx
 *   - src/pages/admin/preview-operations.tsx
 *   - src/pages/admin/program-operations.tsx
 *   - src/pages/admin/programs.tsx
 *   - src/pages/admin/settings.tsx
 *
 * Each test installs an immediately-rejecting fetch (via withErrorCleanup) so
 * every useQuery (retry: 0) lands in isError, then asserts a meaningful
 * ErrorCard message plus a "다시 시도" retry button — never a blank page.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen } from "@testing-library/react";

import {
  renderPage,
  withErrorCleanup,
  AUTH_ADMIN,
} from "./page-test-utils.ts";

import AdminPartners from "../src/pages/admin/partners.tsx";
import AdminPerformanceDashboard from "../src/pages/admin/performance-dashboard.tsx";
import AdminKpi from "../src/pages/admin/kpi.tsx";
import AdminPerformanceEvidence from "../src/pages/admin/performance-evidence.tsx";
import AdminPerformanceExport from "../src/pages/admin/performance-export.tsx";
import AdminPerformanceIndicators from "../src/pages/admin/performance-indicators.tsx";
import AdminPerformanceResults from "../src/pages/admin/performance-results.tsx";
import AdminPerformanceSourceData from "../src/pages/admin/performance-source-data.tsx";
import AdminPreviewOperations from "../src/pages/admin/preview-operations.tsx";
import AdminProgramOperations from "../src/pages/admin/program-operations.tsx";
import AdminPrograms from "../src/pages/admin/programs.tsx";
import AdminSettings from "../src/pages/admin/settings.tsx";

test(
  "AdminPartners — shows ErrorCard with retry when the companies query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPartners), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("참여기업 정보를 불러오지 못했습니다."),
      "AdminPartners should show a helpful error message when the companies query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPartners should show a retry button on error",
    );
  }),
);

test(
  "AdminPerformanceDashboard — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPerformanceDashboard), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "AdminPerformanceDashboard should show a helpful error message when the years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPerformanceDashboard should show a retry button on error",
    );
  }),
);

test(
  "AdminKpi (kpi alias) — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminKpi), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "AdminKpi should show a helpful error message when the years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminKpi should show a retry button on error",
    );
  }),
);

test(
  "AdminPerformanceEvidence — shows ErrorCard with retry when the files query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPerformanceEvidence), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("증빙자료 목록을 불러오지 못했습니다."),
      "AdminPerformanceEvidence should show a helpful error message when the files query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPerformanceEvidence should show a retry button on error",
    );
  }),
);

test(
  "AdminPerformanceExport — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPerformanceExport), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "AdminPerformanceExport should show a helpful error message when the years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPerformanceExport should show a retry button on error",
    );
  }),
);

test(
  "AdminPerformanceIndicators — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPerformanceIndicators), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "AdminPerformanceIndicators should show a helpful error message when the years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPerformanceIndicators should show a retry button on error",
    );
  }),
);

test(
  "AdminPerformanceResults — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPerformanceResults), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "AdminPerformanceResults should show a helpful error message when the years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPerformanceResults should show a retry button on error",
    );
  }),
);

test(
  "AdminPerformanceSourceData — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPerformanceSourceData), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "AdminPerformanceSourceData should show a helpful error message when the years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPerformanceSourceData should show a retry button on error",
    );
  }),
);

test(
  "AdminPreviewOperations — shows ErrorCard with retry when the operations query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPreviewOperations), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("역할별 Preview 데이터를 불러오지 못했습니다."),
      "AdminPreviewOperations should show a helpful error message when the operations query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPreviewOperations should show a retry button on error",
    );
  }),
);

test(
  "AdminProgramOperations — shows ErrorCard with retry when the programs query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminProgramOperations), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("프로그램 목록을 불러오지 못했습니다."),
      "AdminProgramOperations should show a helpful error message when the programs query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminProgramOperations should show a retry button on error",
    );
  }),
);

test(
  "AdminPrograms — shows ErrorCard with retry when the programs query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminPrograms), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("프로그램 API에 연결할 수 없습니다."),
      "AdminPrograms should show a helpful error message when the programs query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminPrograms should show a retry button on error",
    );
  }),
);

test(
  "AdminSettings — shows ErrorCard with retry when the system-status query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminSettings), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText(
        "시스템 상태를 조회하지 못했습니다. SYSTEM_ADMIN 또는 AUDITOR 권한을 확인해 주세요.",
      ),
      "AdminSettings should show a helpful error message when the status query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminSettings should show a retry button on error",
    );
  }),
);
