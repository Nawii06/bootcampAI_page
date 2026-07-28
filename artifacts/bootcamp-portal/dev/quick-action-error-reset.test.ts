/**
 * Regression test — the generic error banner from a failed quick action on
 * /admin/partners must not linger once the admin starts another action.
 *
 * Quick actions (공개 toggle, 담당자 추가, 전문가 추가, 담당자 보관) all share
 * companyMutation. Previously a failure left the red banner on screen until a
 * company edit was opened or cancelled. The page now calls
 * companyMutation.reset() at the start of every quick action and save, so
 * beginning any new action clears the stale banner.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";

import { renderPage, withCleanup, AUTH_ADMIN } from "./page-test-utils.ts";

import AdminPartners from "../src/pages/admin/partners.tsx";

const SERVER_ERROR = "서버 오류가 발생했습니다.";

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
const JSON_HEADERS = { "content-type": "application/json" };

/** Serve the background GET refetches so query errors don't pollute the banner. */
function handleGet(input: RequestInfo | URL): Response | null {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("/api/v1/company-applications")) {
    return new Response(JSON.stringify(APPLICATIONS), { status: 200, headers: JSON_HEADERS });
  }
  if (url.includes("/api/v1/companies")) {
    return new Response(JSON.stringify(COMPANIES), { status: 200, headers: JSON_HEADERS });
  }
  return null;
}

/** Fetch stub: mutations fail with a generic (non-field) error envelope; GETs succeed. */
function installServerErrorFetch(): void {
  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") {
      const res = handleGet(input);
      if (res) return Promise.resolve(res);
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: SERVER_ERROR },
        }),
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: JSON_HEADERS,
        },
      ),
    );
  };
}

/** Fetch stub: mutations stay pending indefinitely; GETs still succeed. */
let _pendingRejects: Array<(e: Error) => void> = [];
function installPendingFetch(): void {
  _pendingRejects = [];
  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") {
      const res = handleGet(input);
      if (res) return Promise.resolve(res);
    }
    return new Promise<Response>((_resolve, reject) => {
      _pendingRejects.push(reject);
    });
  };
}

function withQuickActionFetch(fn: () => void | Promise<void>) {
  return withCleanup(async () => {
    sessionStorage.clear();
    try {
      await fn();
    } finally {
      for (const reject of _pendingRejects) reject(new Error("test-cleanup"));
      _pendingRejects = [];
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

test(
  "AdminPartners — starting a new quick action clears the previous error banner",
  withQuickActionFetch(async () => {
    installServerErrorFetch();
    renderPartners();

    // Fail the 공개 toggle on the first company → generic banner appears.
    fireEvent.click(screen.getAllByText("공개")[0]!);
    assert.ok(
      await screen.findByText(new RegExp(SERVER_ERROR)),
      "a failed quick action should surface the generic error banner",
    );

    // Start a new quick action (still in-flight): the stale banner must reset.
    installPendingFetch();
    fireEvent.click(screen.getAllByText("공개")[1]!);

    await waitFor(() => {
      assert.ok(
        !screen.queryByText(new RegExp(SERVER_ERROR)),
        "the old banner must be cleared when a new quick action starts",
      );
    });
  }),
);

test(
  "AdminPartners — starting a new save clears a previous quick-action error",
  withQuickActionFetch(async () => {
    installServerErrorFetch();
    renderPartners();

    // Fail a quick action first.
    fireEvent.click(screen.getAllByText("공개")[0]!);
    assert.ok(await screen.findByText(new RegExp(SERVER_ERROR)));

    // Open the edit form and save while the request stays pending.
    installPendingFetch();
    fireEvent.click(screen.getAllByText("수정")[0]!);
    fireEvent.click(await screen.findByText("저장"));

    await waitFor(() => {
      assert.ok(
        !screen.queryByText(new RegExp(SERVER_ERROR)),
        "a new save must clear the stale quick-action banner",
      );
    });
  }),
);
