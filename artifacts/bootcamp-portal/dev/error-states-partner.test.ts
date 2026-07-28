/**
 * Error-state tests for partner portal pages.
 *
 * Covered pages:
 *   - src/pages/partner/application.tsx
 *   - src/pages/partner/dashboard.tsx
 *   - src/pages/partner/evaluation.tsx
 *   - src/pages/partner/project.tsx
 *
 * Each test installs a fetch stub that rejects immediately (via
 * withErrorCleanup) so every on-mount useQuery (retry: 0) lands in
 * isError=true. We assert a meaningful ErrorCard message and a retry
 * button — never a blank page.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen } from "@testing-library/react";

import {
  renderPage,
  withErrorCleanup,
  AUTH_PARTNER,
} from "./page-test-utils.ts";

import PartnerApplication from "../src/pages/partner/application.tsx";
import PartnerDashboard from "../src/pages/partner/dashboard.tsx";
import PartnerEvaluation from "../src/pages/partner/evaluation.tsx";
import PartnerProject from "../src/pages/partner/project.tsx";
import PartnerSurvey from "../src/pages/partner/survey.tsx";

test(
  "PartnerApplication — shows ErrorCard with retry when the applications query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(PartnerApplication), { auth: AUTH_PARTNER });
    assert.ok(
      await screen.findByText(
        "API 서버 또는 네트워크 연결 상태를 확인해 주세요.",
      ),
      "PartnerApplication should show the ErrorCard guidance message when the applications query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "PartnerApplication should show a retry button on error",
    );
  }),
);

test(
  "PartnerDashboard — shows ErrorCard with retry when the participations query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(PartnerDashboard), { auth: AUTH_PARTNER });
    assert.ok(
      await screen.findByText(
        "승인 기업 연결정보 또는 활동내역을 불러오지 못했습니다.",
      ),
      "PartnerDashboard should show a helpful error message when the participations query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "PartnerDashboard should show a retry button on error",
    );
  }),
);

test(
  "PartnerEvaluation — shows ErrorCard with retry when the portfolio query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(PartnerEvaluation), { auth: AUTH_PARTNER });
    assert.ok(
      await screen.findByText("포트폴리오 데이터를 불러오지 못했습니다."),
      "PartnerEvaluation should show a helpful error message when the portfolio query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "PartnerEvaluation should show a retry button on error",
    );
  }),
);

test(
  "PartnerProject — shows ErrorCard with retry when the business-years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(PartnerProject), { auth: AUTH_PARTNER });
    assert.ok(
      await screen.findByText("사업연도 정보를 불러오지 못했습니다."),
      "PartnerProject should show a helpful error message when the business-years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "PartnerProject should show a retry button on error",
    );
  }),
);

test(
  "PartnerSurvey — shows ErrorCard with retry when the business-years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(PartnerSurvey), { auth: AUTH_PARTNER });
    assert.ok(
      await screen.findByText("수요조사 목록을 불러오지 못했습니다."),
      "PartnerSurvey should show a helpful error message when the business-years query fails",
    );
    assert.ok(
      screen.queryAllByText("다시 시도").length >= 1,
      "PartnerSurvey should show a retry button on error",
    );
  }),
);
