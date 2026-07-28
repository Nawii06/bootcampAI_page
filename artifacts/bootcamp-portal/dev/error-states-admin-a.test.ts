/**
 * Error-state tests for admin portal pages (batch A).
 *
 * Covered pages:
 *   - src/pages/admin/academics.tsx      (ErrorCard added)
 *   - src/pages/admin/applications.tsx   (ErrorCard added)
 *   - src/pages/admin/audit-logs.tsx     (pre-existing ErrorCard)
 *   - src/pages/admin/budget.tsx         (pre-existing ErrorCard)
 *   - src/pages/admin/budget-log.tsx     (pre-existing ErrorCard)
 *   - src/pages/admin/completion.tsx     (pre-existing ErrorCard)
 *   - src/pages/admin/dashboard.tsx      (pre-existing ErrorCard)
 *   - src/pages/admin/employment.tsx     (retry button added)
 *   - src/pages/admin/evaluation.tsx     (ErrorCard added)
 *   - src/pages/admin/evidence.tsx       (pre-existing ErrorCard)
 *   - src/pages/admin/course-imports.tsx (SKIPPED — mutation-only, no on-load query)
 *
 * Each test installs an immediately-rejecting fetch (withErrorCleanup) so
 * every useQuery (retry: 0) lands in isError, then asserts a meaningful
 * Korean error message and a "다시 시도" retry button are visible.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen } from "@testing-library/react";

import {
  renderPage,
  withErrorCleanup,
  AUTH_ADMIN,
} from "./page-test-utils.ts";

import AdminAcademics from "../src/pages/admin/academics.tsx";
import AdminApplications from "../src/pages/admin/applications.tsx";
import AdminAuditLogs from "../src/pages/admin/audit-logs.tsx";
import AdminBudget from "../src/pages/admin/budget.tsx";
import AdminBudgetLog from "../src/pages/admin/budget-log.tsx";
import AdminCompletion from "../src/pages/admin/completion.tsx";
import AdminDashboard from "../src/pages/admin/dashboard.tsx";
import AdminEmployment from "../src/pages/admin/employment.tsx";
import AdminEvaluation from "../src/pages/admin/evaluation.tsx";
import AdminEvidence from "../src/pages/admin/evidence.tsx";

// ─── academics ────────────────────────────────────────────────────────────────

test(
  "AdminAcademics — shows ErrorCard with retry when academics queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminAcademics), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("학사·교육과정 데이터를 불러오지 못했습니다."),
      "AdminAcademics should show a helpful error message when its queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminAcademics should show a retry button on error",
    );
  }),
);

// ─── applications ───────────────────────────────────────────────────────────

test(
  "AdminApplications — shows ErrorCard with retry when the applications query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminApplications), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("신청·선발 목록을 불러오지 못했습니다."),
      "AdminApplications should show a helpful error message when the applications query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminApplications should show a retry button on error",
    );
  }),
);

// ─── audit-logs ─────────────────────────────────────────────────────────────

test(
  "AdminAuditLogs — shows ErrorCard with retry when the logs query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("감사로그를 조회하지 못했습니다."),
      "AdminAuditLogs should show a helpful error message when the logs query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminAuditLogs should show a retry button on error",
    );
  }),
);

// ─── budget ─────────────────────────────────────────────────────────────────

test(
  "AdminBudget — shows ErrorCard with retry when budget queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminBudget), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("예산 또는 증빙파일 API에 연결할 수 없습니다."),
      "AdminBudget should show a helpful error message when its queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminBudget should show a retry button on error",
    );
  }),
);

// ─── budget-log ─────────────────────────────────────────────────────────────

test(
  "AdminBudgetLog — shows ErrorCard with retry when the history query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminBudgetLog), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("예산 변경이력을 불러오지 못했습니다."),
      "AdminBudgetLog should show a helpful error message when the history query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminBudgetLog should show a retry button on error",
    );
  }),
);

// ─── completion ─────────────────────────────────────────────────────────────

test(
  "AdminCompletion — shows ErrorCard with retry when the assessments query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminCompletion), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("이수 평가 결과를 불러오지 못했습니다."),
      "AdminCompletion should show a helpful error message when the assessments query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminCompletion should show a retry button on error",
    );
  }),
);

// ─── dashboard ──────────────────────────────────────────────────────────────

test(
  "AdminDashboard — shows ErrorCard with retry when dashboard queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminDashboard), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText(
        "일부 운영 지표를 불러오지 못했습니다. 권한과 API 연결 상태를 확인해 주세요.",
      ),
      "AdminDashboard should show a helpful error message when its queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminDashboard should show a retry button on error",
    );
  }),
);

// ─── employment ─────────────────────────────────────────────────────────────

test(
  "AdminEmployment — shows ErrorCard with retry when the participations query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminEmployment), { auth: AUTH_ADMIN });
    // ErrorCard renders error.message plus its standard guidance line.
    assert.ok(
      (
        await screen.findAllByText(
          "API 서버 또는 네트워크 연결 상태를 확인해 주세요.",
        )
      ).length >= 1,
      "AdminEmployment should show the ErrorCard guidance message when the query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminEmployment should show a retry button on error",
    );
  }),
);

// ─── evaluation ─────────────────────────────────────────────────────────────

test(
  "AdminEvaluation — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminEvaluation), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("성과 자체평가 데이터를 불러오지 못했습니다."),
      "AdminEvaluation should show a helpful error message when its queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminEvaluation should show a retry button on error",
    );
  }),
);

// ─── evidence ───────────────────────────────────────────────────────────────

test(
  "AdminEvidence — shows ErrorCard with retry when the files query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminEvidence), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("증빙자료 목록을 불러오지 못했습니다."),
      "AdminEvidence should show a helpful error message when the files query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "AdminEvidence should show a retry button on error",
    );
  }),
);

// ─── course-imports ─────────────────────────────────────────────────────────
// SKIPPED: this page performs no on-load data fetching — all network calls are
// mutation-only (staging/preview/upload/commit), so there is no query that can
// land in an error state on initial mount.
