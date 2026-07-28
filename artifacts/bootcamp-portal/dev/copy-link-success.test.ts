/**
 * Copy-share-link success tests — student portfolio page.
 *
 * Complements dev/copy-link-error.test.ts's failure coverage with the happy
 * path of the "링크 복사" flow:
 *   1. Existing shareToken: clicking copies the exact
 *      `{origin}/public/portfolio/{token}` URL, shows "링크 복사됨",
 *      and never POSTs.
 *   2. No shareToken: the token returned by POST /share-token is used in
 *      the copied URL, and the experiential-records query is invalidated.
 *
 * DOM environment: happy-dom (setup-dom.ts). Shared shims/auth come from
 * dev/page-test-utils.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, Fragment } from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AUTH_STUDENT } from "./page-test-utils.ts";
import { AuthContext } from "../src/contexts/AuthContext.tsx";
import StudentPortfolio from "../src/pages/student/portfolio.tsx";
import { Toaster } from "../src/components/ui/toaster.tsx";

// ─── Fixture data (query keys copied verbatim from portfolio.tsx) ────────────

const YEAR_ID = "year-2026";
const RECORD_ID = "rec-1";
const STUDENT_ID = "usr-student";
const POSTED_TOKEN = "tok-fresh456";

const YEARS_KEY = ["reference", "business-years", "active"];
const RECORDS_KEY = ["student", "experiential-records", YEAR_ID, "PROJECT"];
const LINKS_KEY = ["student", "employment-links", STUDENT_ID];

function makeRecord(shareToken: string | null) {
  return {
    id: RECORD_ID,
    title: "자율주행 로봇 프로젝트",
    type: "PROJECT",
    status: "VERIFIED",
    createdAt: "2026-06-01T00:00:00.000Z",
    evidence: {
      summary: "ROS2 기반 자율주행 로봇 개발",
      techStack: ["Python", "ROS2"],
      outputLinks: [],
      publicConsent: true,
      shareToken,
    },
  };
}

// ─── Fetch stub: POST succeeds with a fresh token, GETs return fixtures ──────

interface RecordedRequest {
  url: string;
  method: string;
}

const _originalFetch = globalThis.fetch;
let _requests: RecordedRequest[] = [];

function installSucceedingFetch(shareToken: string | null): void {
  _requests = [];
  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    _requests.push({ url, method });
    const body =
      method === "POST"
        ? { shareToken: POSTED_TOKEN }
        : url.includes("/experiential-records")
          ? { data: [makeRecord(shareToken)] }
          : url.includes("business-years")
            ? { data: [{ id: YEAR_ID, label: "2026" }] }
            : { data: [] };
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
}

function removeRecordingFetch(): void {
  globalThis.fetch = _originalFetch;
}

function postRequests(): RecordedRequest[] {
  return _requests.filter((r) => r.method === "POST");
}

// ─── Clipboard stub (always succeeds; records writes) ────────────────────────

let _clipboardWrites: string[] = [];

function installClipboard(): void {
  _clipboardWrites = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: (text: string): Promise<void> => {
        _clipboardWrites.push(text);
        return Promise.resolve();
      },
    },
  });
}

// ─── Test wrapper (renders with an inspectable QueryClient) ──────────────────

let _client: QueryClient;
let _invalidatedKeys: unknown[][] = [];

function withCopySuccessTest(
  shareToken: string | null,
  fn: () => void | Promise<void>,
) {
  return async () => {
    installSucceedingFetch(shareToken);
    installClipboard();
    _client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    _client.setQueryData(YEARS_KEY, { data: [{ id: YEAR_ID, label: "2026" }] });
    _client.setQueryData(RECORDS_KEY, { data: [makeRecord(shareToken)] });
    _client.setQueryData(LINKS_KEY, { data: [] });
    _invalidatedKeys = [];
    const originalInvalidate = _client.invalidateQueries.bind(_client);
    _client.invalidateQueries = ((filters?: { queryKey?: unknown[] }) => {
      if (filters?.queryKey) _invalidatedKeys.push(filters.queryKey);
      return originalInvalidate(filters as never);
    }) as typeof _client.invalidateQueries;
    try {
      render(
        createElement(
          AuthContext.Provider,
          { value: AUTH_STUDENT },
          createElement(
            QueryClientProvider,
            { client: _client },
            createElement(
              Fragment,
              null,
              createElement(StudentPortfolio),
              createElement(Toaster),
            ),
          ),
        ),
      );
      await fn();
    } finally {
      cleanup();
      removeRecordingFetch();
    }
  };
}

function copyButton(): HTMLButtonElement {
  const btn = screen
    .getAllByText(/링크 복사|복사 중…/)
    .map((el) => el.closest("button"))
    .find(Boolean);
  assert.ok(btn, "card should render a 링크 복사 button");
  return btn as HTMLButtonElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test(
  "with an existing shareToken, 링크 복사 copies the exact share URL and shows 링크 복사됨",
  withCopySuccessTest("tok-abc123", async () => {
    fireEvent.click(copyButton());

    await screen.findByText("링크 복사됨");

    assert.equal(_clipboardWrites.length, 1, "exactly one clipboard write");
    const origin = window.location.origin;
    assert.ok(origin, "happy-dom must provide a window.location.origin");
    assert.equal(
      _clipboardWrites[0],
      `${origin}/public/portfolio/tok-abc123`,
      "copied URL must be {origin}/public/portfolio/{existing token}",
    );
    assert.equal(
      postRequests().length,
      0,
      "an existing shareToken must not trigger a POST request",
    );
    assert.ok(
      !screen.queryByText("복사 실패"),
      "failure toast must not appear on success",
    );
  }),
);

test(
  "with no shareToken, the POSTed token is copied and the records query is invalidated",
  withCopySuccessTest(null, async () => {
    fireEvent.click(copyButton());

    await screen.findByText("링크 복사됨");

    assert.equal(
      postRequests().length,
      1,
      "clicking should send exactly one POST request",
    );
    assert.equal(
      postRequests()[0].url,
      `/api/v1/experiential-records/${RECORD_ID}/share-token`,
      "POST should target the record's share-token endpoint",
    );
    assert.equal(_clipboardWrites.length, 1, "exactly one clipboard write");
    assert.equal(
      _clipboardWrites[0],
      `${window.location.origin}/public/portfolio/${POSTED_TOKEN}`,
      "copied URL must use the token returned by the POST response",
    );
    await waitFor(() => {
      assert.ok(
        _invalidatedKeys.some(
          (key) =>
            Array.isArray(key) &&
            key[0] === "student" &&
            key[1] === "experiential-records",
        ),
        "records query must be invalidated after minting a fresh token",
      );
    });
  }),
);
