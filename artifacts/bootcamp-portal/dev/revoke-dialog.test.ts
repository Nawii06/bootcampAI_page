/**
 * Revoke-link confirmation dialog tests — student portfolio page.
 *
 * Verifies the AlertDialog safeguard around "링크 해제" (revoke share link):
 *   1. Clicking the card's "링크 해제" button opens the dialog and sends
 *      NO DELETE request by itself.
 *   2. Clicking "취소" closes the dialog and still sends no request.
 *   3. Clicking the dialog's confirm "링크 해제" action sends the DELETE
 *      request and surfaces the "링크 해제됨" success toast.
 *
 * Pattern follows dev/loading-spinner-states.test.ts (auth-context
 * injection + per-test QueryClient with setQueryData + fetch stub).
 * DOM environment: happy-dom (setup-dom.ts).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, Fragment } from "react";
import {
  render,
  screen,
  within,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContext } from "../src/contexts/AuthContext.tsx";
import StudentPortfolio from "../src/pages/student/portfolio.tsx";
import { Toaster } from "../src/components/ui/toaster.tsx";

// ─── One-time global setup (same as loading-spinner-states.test.ts) ─────────

(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

if (!("addEventListener" in globalThis)) {
  const win = (globalThis as Record<string, unknown>).window as
    | (Window & typeof globalThis)
    | undefined;
  if (win) {
    (globalThis as Record<string, unknown>).addEventListener =
      win.addEventListener.bind(win);
    (globalThis as Record<string, unknown>).removeEventListener =
      win.removeEventListener.bind(win);
    (globalThis as Record<string, unknown>).dispatchEvent =
      win.dispatchEvent.bind(win);
  }
}

// Radix UI's useSize hook needs ResizeObserver; happy-dom doesn't provide it.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!("sessionStorage" in globalThis)) {
  const _store: Record<string, string> = {};
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => _store[k] ?? null,
    setItem: (k: string, v: string) => {
      _store[k] = v;
    },
    removeItem: (k: string) => {
      delete _store[k];
    },
    clear: () => {
      for (const k of Object.keys(_store)) delete _store[k];
    },
    get length() {
      return Object.keys(_store).length;
    },
    key: (i: number) => Object.keys(_store)[i] ?? null,
  };
}

// ─── Mock auth ────────────────────────────────────────────────────────────────

const STUDENT_USER = {
  id: "usr-student",
  accountId: "acc-student",
  name: "테스트 학생",
  role: "student" as const,
  roles: ["STUDENT"],
};

const AUTH_STUDENT = {
  user: STUDENT_USER,
  isLoading: false,
  logout: async () => {},
  refreshSession: async () => STUDENT_USER,
  loginWithFakeIdentity: async () => STUDENT_USER,
  hasPermission: (roles: string[]) =>
    STUDENT_USER.roles.some((r) => roles.includes(r)),
};

// ─── Fixture data (query keys copied verbatim from portfolio.tsx) ────────────

const YEAR_ID = "year-2026";
const RECORD_ID = "rec-1";

const YEARS_KEY = ["reference", "business-years", "active"];
const RECORDS_KEY = ["student", "experiential-records", YEAR_ID, "PROJECT"];
const LINKS_KEY = ["student", "employment-links", STUDENT_USER.id];

const RECORD = {
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
    shareToken: "tok-abc123",
  },
};

const QUERY_DATA = [
  { queryKey: YEARS_KEY, data: { data: [{ id: YEAR_ID, label: "2026" }] } },
  { queryKey: RECORDS_KEY, data: { data: [RECORD] } },
  { queryKey: LINKS_KEY, data: { data: [] } },
];

// ─── Fetch stub that records every request ───────────────────────────────────

interface RecordedRequest {
  url: string;
  method: string;
}

const _originalFetch = globalThis.fetch;
let _requests: RecordedRequest[] = [];

function installRecordingFetch(): void {
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
    _requests.push({ url, method: (init?.method ?? "GET").toUpperCase() });
    return Promise.resolve(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
}

/** Same recording stub, but DELETE requests reject (network error). */
function installFailingDeleteFetch(): void {
  installRecordingFetch();
  const recording = globalThis.fetch;
  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "DELETE") {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      _requests.push({ url, method });
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    return recording(input, init);
  };
}

function removeRecordingFetch(): void {
  globalThis.fetch = _originalFetch;
}

function deleteRequests(): RecordedRequest[] {
  return _requests.filter((r) => r.method === "DELETE");
}

// ─── Render helper ────────────────────────────────────────────────────────────

function renderPortfolio(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 0, refetchOnMount: false } },
  });
  for (const { queryKey, data } of QUERY_DATA) {
    client.setQueryData(queryKey, data);
  }
  render(
    createElement(
      AuthContext.Provider,
      { value: AUTH_STUDENT },
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          Fragment,
          null,
          createElement(StudentPortfolio),
          createElement(Toaster),
        ),
      ),
    ),
  );
}

function withRevokeTest(
  fn: () => void | Promise<void>,
  installFetch: () => void = installRecordingFetch,
) {
  return async () => {
    installFetch();
    try {
      renderPortfolio();
      await fn();
    } finally {
      cleanup();
      removeRecordingFetch();
    }
  };
}

/** The revoke button rendered on the portfolio card (outside the dialog). */
function cardRevokeButton(): HTMLElement {
  const btn = screen
    .getAllByText("링크 해제")
    .map((el) => el.closest("button"))
    .find((b) => b && !b.closest('[role="alertdialog"]'));
  assert.ok(btn, "card should render a 링크 해제 button");
  return btn as HTMLElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test(
  "clicking 링크 해제 opens the confirmation dialog and sends no DELETE request",
  withRevokeTest(async () => {
    assert.ok(
      !screen.queryByRole("alertdialog"),
      "dialog should be closed initially",
    );

    fireEvent.click(cardRevokeButton());

    const dialog = await screen.findByRole("alertdialog");
    assert.ok(
      within(dialog).getByText("공유 링크를 해제할까요?"),
      "dialog should show the confirmation title",
    );
    assert.ok(
      within(dialog).getByText(/자율주행 로봇 프로젝트/),
      "dialog description should mention the record title",
    );
    assert.equal(
      deleteRequests().length,
      0,
      "opening the dialog must not send a DELETE request",
    );
    assert.equal(
      _requests.length,
      0,
      "opening the dialog must not send any network request",
    );
  }),
);

test(
  "취소 closes the dialog without sending any request",
  withRevokeTest(async () => {
    fireEvent.click(cardRevokeButton());
    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByText("취소"));

    await waitFor(() => {
      assert.ok(
        !screen.queryByRole("alertdialog"),
        "dialog should close after 취소",
      );
    });
    assert.equal(
      deleteRequests().length,
      0,
      "cancelling must not send a DELETE request",
    );
    assert.equal(
      _requests.length,
      0,
      "cancelling must not send any network request",
    );
  }),
);

test(
  "confirming 링크 해제 sends the DELETE request and shows the success toast",
  withRevokeTest(async () => {
    fireEvent.click(cardRevokeButton());
    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByText("링크 해제"));

    await waitFor(() => {
      assert.equal(
        deleteRequests().length,
        1,
        "confirming should send exactly one DELETE request",
      );
    });
    assert.equal(
      deleteRequests()[0].url,
      `/api/v1/experiential-records/${RECORD_ID}/share-token`,
      "DELETE should target the record's share-token endpoint",
    );

    await screen.findByText("링크 해제됨");
    await waitFor(() => {
      assert.ok(
        !screen.queryByRole("alertdialog"),
        "dialog should close after confirming",
      );
    });
  }),
);

test(
  "confirming 링크 해제 while the DELETE fails shows the failure toast",
  withRevokeTest(async () => {
    fireEvent.click(cardRevokeButton());
    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByText("링크 해제"));

    await waitFor(() => {
      assert.equal(
        deleteRequests().length,
        1,
        "confirming should still send the DELETE request",
      );
    });

    await screen.findByText("링크 해제 실패");
    assert.ok(
      !screen.queryByText("링크 해제됨"),
      "success toast must not appear when the DELETE fails",
    );
  }, installFailingDeleteFetch),
);

test(
  "after a failed revoke the card button returns from 해제 중… to 링크 해제",
  withRevokeTest(async () => {
    fireEvent.click(cardRevokeButton());
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByText("링크 해제"));

    await screen.findByText("링크 해제 실패");

    await waitFor(() => {
      const btn = cardRevokeButton();
      assert.ok(
        !btn.textContent?.includes("해제 중…"),
        "button should leave the 해제 중… pending state after failure",
      );
      assert.ok(
        btn.textContent?.includes("링크 해제"),
        "button should return to its normal label",
      );
      assert.equal(
        (btn as HTMLButtonElement).disabled,
        false,
        "button should be re-enabled after failure (revokingId reset)",
      );
    });
  }, installFailingDeleteFetch),
);
