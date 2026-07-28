/**
 * Regression test — stale inline validation errors must not linger when the
 * admin switches between company edits on /admin/partners.
 *
 * The page calls companyMutation.reset() when "수정" is clicked for a company
 * and when "취소" cancels editing. These tests simulate a failed PATCH save
 * (VALIDATION_ERROR envelope with a website field error) and assert the error
 * disappears when:
 *   1. the admin opens the edit form for another company, and
 *   2. the admin cancels editing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";

import { renderPage, withCleanup, AUTH_ADMIN } from "./page-test-utils.ts";

import AdminPartners from "../src/pages/admin/partners.tsx";

const WEBSITE_ERROR = "웹사이트 URL 형식이 올바르지 않습니다.";

const company = (id: string, name: string) => ({
  id,
  name,
  companyType: "IT서비스",
  registrationNumber: `000-00-0000${id}`,
  description: null,
  website: null,
  isActive: true,
  isPublic: false,
  companyContacts: [],
  companyExperts: [],
  companyParticipations: [],
});

const COMPANIES = {
  data: [company("c1", "알파주식회사"), company("c2", "베타주식회사")],
};
const APPLICATIONS = { data: [], commitments: [] };

const _originalFetch = globalThis.fetch;

/** Fetch stub: PATCH /api/v1/companies/* fails with a VALIDATION_ERROR envelope. */
function installValidationErrorFetch(): void {
  globalThis.fetch = (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if ((init?.method ?? "GET").toUpperCase() === "PATCH") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "입력값을 확인해 주세요.",
              fieldErrors: [
                { field: "website", code: "invalid_url", message: WEBSITE_ERROR },
              ],
            },
          }),
          {
            status: 400,
            statusText: "Bad Request",
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }
    return Promise.reject(new Error("unexpected fetch in test"));
  };
}

function withValidationErrorFetch(fn: () => void | Promise<void>) {
  return withCleanup(async () => {
    installValidationErrorFetch();
    // Ensure no draft from a previous test re-populates the form.
    sessionStorage.clear();
    try {
      await fn();
    } finally {
      globalThis.fetch = _originalFetch;
    }
  });
}

function renderPartners() {
  return renderPage(createElement(AdminPartners), {
    auth: AUTH_ADMIN,
    queryData: [
      { queryKey: ["admin", "companies"], data: COMPANIES },
      { queryKey: ["admin", "company-applications"], data: APPLICATIONS },
    ],
  });
}

/** Open the edit form for the row at `index` and trigger a failing save. */
async function failSaveFor(index: number): Promise<void> {
  fireEvent.click(screen.getAllByText("수정")[index]!);
  fireEvent.click(await screen.findByText("저장"));
  assert.ok(
    await screen.findByText(WEBSITE_ERROR),
    "a failed save should surface the website field error",
  );
}

test(
  "AdminPartners — opening edit for another company clears stale field errors",
  withValidationErrorFetch(async () => {
    renderPartners();
    await failSaveFor(0);

    // Switch to editing the second company.
    fireEvent.click(screen.getAllByText("수정")[1]!);

    await waitFor(() => {
      assert.ok(
        !screen.queryByText(WEBSITE_ERROR),
        "the previous company's field error must not linger after switching",
      );
    });
    // The form now targets the second company.
    assert.equal(
      screen.getByPlaceholderText("기업명").getAttribute("value"),
      "베타주식회사",
    );
    // No generic error text either.
    assert.ok(!screen.queryByText(/HTTP 400/));
  }),
);

test(
  "AdminPartners — cancelling the edit clears stale field errors",
  withValidationErrorFetch(async () => {
    renderPartners();
    await failSaveFor(0);

    fireEvent.click(screen.getByText("취소"));

    await waitFor(() => {
      assert.ok(
        !screen.queryByText(WEBSITE_ERROR),
        "cancelling the edit must clear the stale field error",
      );
    });
    // The edit section is closed entirely.
    assert.ok(!screen.queryByText("기업정보 수정"));
    assert.ok(!screen.queryByText(/HTTP 400/));
  }),
);
