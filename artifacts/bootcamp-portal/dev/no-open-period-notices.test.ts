/**
 * "No open period" notices on the remaining submission forms.
 *
 * /partner/survey and /partner/project already lock in this pattern
 * (dev/project-empty-state.test.ts, dev/survey-empty-state.test.ts).
 * This file covers the other pages that gate submission on an active
 * business year:
 *   - /partner/evaluation  — feedback save button
 *   - /partner/employment  — 신규 고용 건 등록 form
 *   - /student/portfolio   — 포트폴리오 등록 form
 *
 * Each page must show an explicit role="status" notice when the active
 * business-years query succeeds with ZERO years, and must NOT show it
 * when an active year exists.
 *
 * Pattern follows dev/TESTING.md: AuthContext.Provider injection (no
 * mock.module()), setQueryData pre-populates every query so no fetch runs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen } from "@testing-library/react";

import {
  AUTH_PARTNER,
  AUTH_STUDENT,
  renderPage,
  withCleanup,
} from "./page-test-utils.ts";
import PartnerEvaluation from "../src/pages/partner/evaluation.tsx";
import PartnerEmployment from "../src/pages/partner/employment.tsx";
import StudentPortfolio from "../src/pages/student/portfolio.tsx";

const YEARS_KEY = ["reference", "business-years", "active"];
const NO_YEARS = { queryKey: YEARS_KEY, data: { data: [] } };
const ONE_YEAR = {
  queryKey: YEARS_KEY,
  data: { data: [{ id: "year-1", name: "2026" }] },
};

function statusWithText(text: string): HTMLElement | undefined {
  return screen
    .queryAllByRole("status")
    .find((el) => el.textContent?.includes(text));
}

// ─── /partner/evaluation ─────────────────────────────────────────────────────

const EVAL_NOTICE = "현재 진행 중인 평가 기간이 없습니다";

test(
  "PartnerEvaluation — zero active years shows the role=status notice",
  withCleanup(() => {
    renderPage(createElement(PartnerEvaluation), {
      auth: AUTH_PARTNER,
      queryData: [
        NO_YEARS,
        { queryKey: ["partner", "portfolio-candidates"], data: { data: [] } },
      ],
    });
    assert.ok(
      statusWithText(EVAL_NOTICE),
      "role=status notice should explain there is no open evaluation period",
    );
  }),
);

test(
  "PartnerEvaluation — active year hides the no-open-period notice",
  withCleanup(() => {
    renderPage(createElement(PartnerEvaluation), {
      auth: AUTH_PARTNER,
      queryData: [
        ONE_YEAR,
        { queryKey: ["partner", "portfolio-candidates"], data: { data: [] } },
      ],
    });
    assert.equal(
      screen.queryAllByText(EVAL_NOTICE, { exact: false }).length,
      0,
      "Notice must NOT appear when an active year exists",
    );
  }),
);

// ─── /partner/employment ─────────────────────────────────────────────────────

const EMPLOYMENT_NOTICE = "현재 운영 중인 사업연도가 없습니다";

test(
  "PartnerEmployment — zero active years shows the form notice and the list card",
  withCleanup(() => {
    renderPage(createElement(PartnerEmployment), {
      auth: AUTH_PARTNER,
      queryData: [NO_YEARS],
    });
    assert.ok(
      statusWithText(EMPLOYMENT_NOTICE),
      "Form should carry a role=status no-active-year notice",
    );
    assert.equal(
      screen.queryAllByText(EMPLOYMENT_NOTICE, { exact: false }).length,
      2,
      "Both the form notice and the list card should mention the missing year",
    );
  }),
);

test(
  "PartnerEmployment — active year with zero records shows only the generic empty state",
  withCleanup(() => {
    const participationKeys = ["EMPLOYMENT", "INTERNSHIP", "FIELD_PRACTICE"];
    renderPage(createElement(PartnerEmployment), {
      auth: AUTH_PARTNER,
      queryData: [
        ONE_YEAR,
        ...participationKeys.map((type) => ({
          queryKey: ["partner", "company-participations", "year-1", type],
          data: { data: [] },
        })),
      ],
    });
    assert.ok(
      screen.queryByText("진행 중인 채용연계 건이 없습니다", { exact: false }),
      "Generic empty state should appear when a year is open but no records exist",
    );
    assert.equal(
      screen.queryAllByText(EMPLOYMENT_NOTICE, { exact: false }).length,
      0,
      "No-active-year notice must NOT appear when an active year exists",
    );
  }),
);

// ─── /student/portfolio ──────────────────────────────────────────────────────

const PORTFOLIO_NOTICE = "현재 진행 중인 포트폴리오 등록 기간이 없습니다";
const PORTFOLIO_GENERIC = "등록된 프로젝트 포트폴리오가 없습니다";

test(
  "StudentPortfolio — zero active years shows the notice in form and list",
  withCleanup(() => {
    renderPage(createElement(StudentPortfolio), {
      auth: AUTH_STUDENT,
      queryData: [
        NO_YEARS,
        {
          queryKey: ["student", "employment-links", "usr-student"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      statusWithText(PORTFOLIO_NOTICE),
      "Form should carry a role=status no-open-period notice",
    );
    assert.equal(
      screen.queryAllByText(PORTFOLIO_NOTICE, { exact: false }).length,
      2,
      "Both the form notice and the list empty state should show the message",
    );
    assert.equal(
      screen.queryAllByText(PORTFOLIO_GENERIC, { exact: false }).length,
      0,
      "Generic empty state must NOT appear when there is no open period",
    );
  }),
);

test(
  "StudentPortfolio — active year with zero records shows the generic empty state only",
  withCleanup(() => {
    renderPage(createElement(StudentPortfolio), {
      auth: AUTH_STUDENT,
      queryData: [
        ONE_YEAR,
        {
          queryKey: ["student", "experiential-records", "year-1", "PROJECT"],
          data: { data: [] },
        },
        {
          queryKey: ["student", "employment-links", "usr-student"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      screen.queryByText(PORTFOLIO_GENERIC, { exact: false }),
      "Generic empty state should appear when a period is open but no records exist",
    );
    assert.equal(
      screen.queryAllByText(PORTFOLIO_NOTICE, { exact: false }).length,
      0,
      "No-open-period notice must NOT appear when an active year exists",
    );
  }),
);
