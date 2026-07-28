/**
 * Error-state tests for public + student portal pages.
 *
 * Covered pages:
 *   - src/pages/public/home.tsx
 *   - src/pages/public/partners.tsx
 *   - src/pages/public/performance.tsx
 *   - src/pages/public/recruitment.tsx
 *   - src/pages/student/apply.tsx
 *   - src/pages/student/completion.tsx
 *   - src/pages/student/dashboard.tsx
 *   - src/pages/student/learning.tsx
 *   - src/pages/student/portfolio.tsx
 *
 * Skipped (see report): src/pages/public/portfolio.tsx — its only query is
 * gated by the `:token` route param and it renders a purposeful "not found"
 * UI (expired/private link) without a retry affordance, so it does not fit
 * the ErrorCard-with-retry assertion contract.
 *
 * Each test installs an immediately-rejecting fetch (withErrorCleanup) so every
 * useQuery (retry: 0) lands in isError, then asserts a meaningful error message
 * plus a "다시 시도" retry button — never a blank page.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen } from "@testing-library/react";

import {
  renderPage,
  withErrorCleanup,
  AUTH_ADMIN,
  AUTH_STUDENT,
} from "./page-test-utils.ts";

// The student portfolio page mounts Radix primitives (Checkbox/Progress) that
// read element size via ResizeObserver, which happy-dom does not provide.
// Install a no-op shim locally so these pages can render under the DOM stub.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

import Home from "../src/pages/public/home.tsx";
import Partners from "../src/pages/public/partners.tsx";
import Performance from "../src/pages/public/performance.tsx";
import Recruitment from "../src/pages/public/recruitment.tsx";
import StudentApply from "../src/pages/student/apply.tsx";
import StudentCompletion from "../src/pages/student/completion.tsx";
import StudentDashboard from "../src/pages/student/dashboard.tsx";
import StudentLearning from "../src/pages/student/learning.tsx";
import StudentPortfolio from "../src/pages/student/portfolio.tsx";

// ─── public/home ──────────────────────────────────────────────────────────────
test(
  "Home — shows ErrorCard with retry when the public data queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(Home), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("공개 포털 데이터를 불러오지 못했습니다."),
      "Home should show a helpful error message when the public queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "Home should show a retry button on error",
    );
  }),
);

// ─── public/partners ────────────────────────────────────────────────────────
test(
  "Partners — shows ErrorCard with retry when the companies query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(Partners), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("참여기업 API에 연결할 수 없습니다."),
      "Partners should show a helpful error message when the companies query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "Partners should show a retry button on error",
    );
  }),
);

// ─── public/performance ─────────────────────────────────────────────────────
test(
  "Performance — shows ErrorCard with retry when the performance queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(Performance), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("공개 성과 API 일부에 연결할 수 없습니다."),
      "Performance should show a helpful error message when its queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "Performance should show a retry button on error",
    );
  }),
);

// ─── public/recruitment ─────────────────────────────────────────────────────
test(
  "Recruitment — shows ErrorCard with retry when the programs query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(Recruitment), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("모집 API에 연결할 수 없습니다."),
      "Recruitment should show a helpful error message when the programs query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "Recruitment should show a retry button on error",
    );
  }),
);

// ─── student/apply ──────────────────────────────────────────────────────────
test(
  "StudentApply — shows ErrorCard with retry when the programs query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(StudentApply), { auth: AUTH_STUDENT });
    assert.ok(
      await screen.findByText("프로그램 API에 연결할 수 없습니다."),
      "StudentApply should show a helpful error message when the programs query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "StudentApply should show a retry button on error",
    );
  }),
);

// ─── student/completion ─────────────────────────────────────────────────────
test(
  "StudentCompletion — shows ErrorCard with retry when the assessments query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(StudentCompletion), { auth: AUTH_STUDENT });
    assert.ok(
      await screen.findByText("이수정보 API에 연결할 수 없습니다."),
      "StudentCompletion should show a helpful error message when the assessments query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "StudentCompletion should show a retry button on error",
    );
  }),
);

// ─── student/dashboard ──────────────────────────────────────────────────────
test(
  "StudentDashboard — shows ErrorCard with retry when its queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(StudentDashboard), { auth: AUTH_STUDENT });
    assert.ok(
      await screen.findByText("대시보드 정보를 불러오지 못했습니다."),
      "StudentDashboard should show a helpful error message when its queries fail",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "StudentDashboard should show a retry button on error",
    );
  }),
);

// ─── student/learning ───────────────────────────────────────────────────────
test(
  "StudentLearning — shows ErrorCard with retry when the applications query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(StudentLearning), { auth: AUTH_STUDENT });
    assert.ok(
      await screen.findByText("신청 프로그램 목록을 불러오지 못했습니다."),
      "StudentLearning should show a helpful error message when the applications query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "StudentLearning should show a retry button on error",
    );
  }),
);

// ─── student/portfolio ──────────────────────────────────────────────────────
// On initial mount the `years` (ungated) and `employmentLinks` (gated by the
// logged-in student id) queries run; the employment-links section renders an
// ErrorCard with retry when its query fails.
test(
  "StudentPortfolio — shows ErrorCard with retry when the employment-links query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(StudentPortfolio), { auth: AUTH_STUDENT });
    assert.ok(
      await screen.findByText("채용·연계 이력을 불러오지 못했습니다."),
      "StudentPortfolio should show a helpful error message when the employment-links query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "StudentPortfolio should show a retry button on error",
    );
  }),
);
