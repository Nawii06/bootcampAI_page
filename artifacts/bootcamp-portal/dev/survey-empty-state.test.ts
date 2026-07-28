/**
 * /partner/survey — "no open survey period" vs generic empty state.
 *
 * Locks in the two branches so a refactor cannot silently swap them back:
 *   1. Active business-years query succeeds with ZERO years →
 *      both the form notice and the list card show
 *      "현재 진행 중인 수요조사 기간이 없습니다".
 *   2. An active year exists but has ZERO surveys →
 *      generic "등록된 수요조사가 없습니다" and NO "no open period" notice.
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
  renderPage,
  withCleanup,
} from "./page-test-utils.ts";
import PartnerSurvey from "../src/pages/partner/survey.tsx";

const NO_PERIOD_TEXT = "현재 진행 중인 수요조사 기간이 없습니다";
const GENERIC_EMPTY_TEXT = "등록된 수요조사가 없습니다";

test(
  "PartnerSurvey — zero active years shows the no-open-period message in form and list",
  withCleanup(() => {
    renderPage(createElement(PartnerSurvey), {
      auth: AUTH_PARTNER,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [] },
        },
      ],
    });

    const notices = screen.queryAllByText(NO_PERIOD_TEXT, { exact: false });
    assert.equal(
      notices.length,
      2,
      "Both the form notice and the list card should show the no-open-period message",
    );
    // The form notice is announced via role="status".
    const status = screen.queryByRole("status");
    assert.ok(status, "Form notice should be rendered with role=status");
    assert.ok(
      status!.textContent?.includes(NO_PERIOD_TEXT),
      "role=status element should carry the no-open-period message",
    );
    assert.ok(
      !screen.queryByText(GENERIC_EMPTY_TEXT, { exact: false }),
      "Generic empty state must NOT appear when there is no open period",
    );
  }),
);

test(
  "PartnerSurvey — active year with zero surveys shows the generic empty state only",
  withCleanup(() => {
    renderPage(createElement(PartnerSurvey), {
      auth: AUTH_PARTNER,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [{ id: "year-1", name: "2026" }] },
        },
        {
          queryKey: ["partner", "company-participations", "year-1", "DEMAND_SURVEY"],
          data: { data: [] },
        },
      ],
    });

    assert.ok(
      screen.queryByText(GENERIC_EMPTY_TEXT, { exact: false }),
      "Generic empty state should appear when a period is open but no surveys exist",
    );
    assert.equal(
      screen.queryAllByText(NO_PERIOD_TEXT, { exact: false }).length,
      0,
      "No-open-period message must NOT appear when an active year exists",
    );
  }),
);
