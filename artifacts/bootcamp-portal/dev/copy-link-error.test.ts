/**
 * Copy-share-link failure tests — student portfolio page.
 *
 * Mirrors dev/revoke-dialog.test.ts's failure-path coverage for the
 * "링크 복사" flow (POST /share-token + clipboard write):
 *   1. POST /share-token rejection surfaces the "복사 실패" toast.
 *   2. navigator.clipboard.writeText rejection also surfaces "복사 실패".
 *   3. After a failure the button returns from "복사 중…" to "링크 복사"
 *      and is re-enabled (copyingId reset).
 *
 * DOM environment: happy-dom (setup-dom.ts). Shared shims/auth come from
 * dev/page-test-utils.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, Fragment } from "react";
import {
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";

import {
  AUTH_STUDENT,
  renderPage,
} from "./page-test-utils.ts";
import StudentPortfolio from "../src/pages/student/portfolio.tsx";
import { Toaster } from "../src/components/ui/toaster.tsx";
import { resetToastStore } from "../src/hooks/use-toast.ts";

// ─── Fixture data (query keys copied verbatim from portfolio.tsx) ────────────

const YEAR_ID = "year-2026";
const RECORD_ID = "rec-1";
const STUDENT_ID = "usr-student";

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

function queryData(shareToken: string | null) {
  return [
    { queryKey: YEARS_KEY, data: { data: [{ id: YEAR_ID, label: "2026" }] } },
    { queryKey: RECORDS_KEY, data: { data: [makeRecord(shareToken)] } },
    { queryKey: LINKS_KEY, data: { data: [] } },
  ];
}

// ─── Fetch stub that records every request ───────────────────────────────────

interface RecordedRequest {
  url: string;
  method: string;
}

const _originalFetch = globalThis.fetch;
let _requests: RecordedRequest[] = [];

/**
 * Recording stub where POST requests reject (network error). GET requests
 * return the same fixtures as the seeded query cache so refetch-on-mount
 * does not wipe the rendered record (which would remove the copy button).
 */
function installFailingPostFetch(shareToken: string | null): void {
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
    if (method === "POST") {
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    const body = url.includes("/experiential-records")
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

// ─── Clipboard stub ───────────────────────────────────────────────────────────

let _clipboardWrites: string[] = [];

/** Install a navigator.clipboard stub; rejects when `fail` is true. */
function installClipboard(fail: boolean): void {
  _clipboardWrites = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: (text: string): Promise<void> => {
        if (fail) return Promise.reject(new Error("clipboard denied"));
        _clipboardWrites.push(text);
        return Promise.resolve();
      },
    },
  });
}

// ─── Test wrapper ─────────────────────────────────────────────────────────────

interface CopyTestOptions {
  shareToken: string | null;
  clipboardFails: boolean;
}

function withCopyTest(
  { shareToken, clipboardFails }: CopyTestOptions,
  fn: () => void | Promise<void>,
) {
  return async () => {
    installFailingPostFetch(shareToken);
    installClipboard(clipboardFails);
    try {
      renderPage(
        createElement(
          Fragment,
          null,
          createElement(StudentPortfolio),
          createElement(Toaster),
        ),
        { auth: AUTH_STUDENT, queryData: queryData(shareToken) },
      );
      await fn();
    } finally {
      cleanup();
      removeRecordingFetch();
      // The module-global toast store can hold several toasts; clear it so
      // toasts from one test cannot leak into the next.
      resetToastStore();
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
  "링크 복사 shows the 복사 실패 toast when POST /share-token rejects",
  withCopyTest(
    {
      shareToken: null,
      clipboardFails: false,
    },
    async () => {
      fireEvent.click(copyButton());

      await waitFor(() => {
        assert.equal(
          postRequests().length,
          1,
          "clicking should send exactly one POST request",
        );
      });
      assert.equal(
        postRequests()[0].url,
        `/api/v1/experiential-records/${RECORD_ID}/share-token`,
        "POST should target the record's share-token endpoint",
      );

      await screen.findByText("복사 실패");
      assert.ok(
        !screen.queryByText("링크 복사됨"),
        "success toast must not appear when the POST fails",
      );
      assert.equal(
        _clipboardWrites.length,
        0,
        "clipboard must not be written when token creation fails",
      );
    },
  ),
);

test(
  "링크 복사 shows the 복사 실패 toast when clipboard.writeText rejects",
  withCopyTest(
    {
      shareToken: "tok-abc123",
      clipboardFails: true,
    },
    async () => {
      fireEvent.click(copyButton());

      await screen.findByText("복사 실패");
      assert.ok(
        !screen.queryByText("링크 복사됨"),
        "success toast must not appear when the clipboard write fails",
      );
      assert.equal(
        postRequests().length,
        0,
        "an existing shareToken must not trigger a POST request",
      );
    },
  ),
);

test(
  "after a failed copy the button returns from 복사 중… to 링크 복사",
  withCopyTest(
    {
      shareToken: null,
      clipboardFails: false,
    },
    async () => {
      fireEvent.click(copyButton());

      await screen.findByText("복사 실패");

      await waitFor(() => {
        const btn = copyButton();
        assert.ok(
          !btn.textContent?.includes("복사 중…"),
          "button should leave the 복사 중… pending state after failure",
        );
        assert.ok(
          btn.textContent?.includes("링크 복사"),
          "button should return to its normal label",
        );
        assert.equal(
          btn.disabled,
          false,
          "button should be re-enabled after failure (copyingId reset)",
        );
      });
    },
  ),
);
