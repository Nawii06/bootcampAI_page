/**
 * Tests for the login redirect round-trip:
 *
 *   1. withRoleGuard's login prompt builds the "로그인하기" link with a
 *      `redirect` query param containing the URL-encoded current location.
 *   2. The login page reads the `redirect` param and navigates there after a
 *      successful (fake-identity) login.
 *
 * wouter's `memoryLocation` provides the location + search hooks so tests can
 * start at an arbitrary path and observe navigation without touching the real
 * window history. Auth is injected via `AuthContext.Provider`, and network
 * calls from the login page are stubbed by overriding `globalThis.fetch`.
 *
 * DOM environment (happy-dom) is provided by `dev/setup-dom.ts` via `--import`.
 * Pattern follows dev/role-guard-states.test.ts and dev/loading-spinner-states.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { withRoleGuard } from "../src/components/RoleGuard.tsx";
import { AuthContext, type AuthContextType } from "../src/contexts/AuthContext.tsx";
import type { User } from "../src/types.ts";

// Vite's `define` normally injects this constant at build time. Setting it to
// "FD_Set_01" enables the fake-identity login section on the login page.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = "FD_Set_01";

// wouter calls addEventListener / removeEventListener as bare globals.
if (!("addEventListener" in globalThis)) {
  const win = (globalThis as Record<string, unknown>).window as
    | (Window & typeof globalThis)
    | undefined;
  if (win) {
    (globalThis as Record<string, unknown>).addEventListener = win.addEventListener.bind(win);
    (globalThis as Record<string, unknown>).removeEventListener = win.removeEventListener.bind(win);
    (globalThis as Record<string, unknown>).dispatchEvent = win.dispatchEvent.bind(win);
  }
}

// Import Login AFTER the __FAKE_DATA_SET__ global is in place (the module
// reads it at render time, but keep ordering explicit for clarity).
import Login from "../src/pages/login.tsx";

function withCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
    }
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    accountId: "acc-1",
    name: "테스트 사용자",
    role: "student",
    roles: ["STUDENT"],
    defaultRoute: "/student/home",
    ...overrides,
  } as User;
}

function makeAuth(overrides: Partial<AuthContextType>): AuthContextType {
  return {
    user: null,
    isLoading: false,
    refreshSession: async () => null,
    loginWithFakeIdentity: async () => {
      throw new Error("not implemented in test");
    },
    logout: async () => {},
    hasPermission: () => false,
    ...overrides,
  };
}

function renderAt(
  element: ReactElement,
  auth: AuthContextType,
  path: string,
  searchPath?: string,
) {
  const memory = memoryLocation({ path, searchPath, record: true });
  render(
    createElement(
      Router,
      { hook: memory.hook, searchHook: memory.searchHook },
      createElement(AuthContext.Provider, { value: auth }, element),
    ),
  );
  return memory;
}

// ─── 1. RoleGuard login prompt encodes the current location ─────────────────

function Wrapped(): ReactElement {
  return createElement("div", { "data-testid": "wrapped-content" }, "보호된 콘텐츠");
}
const Guarded = withRoleGuard(Wrapped, ["EMPLOYMENT_ADMIN"]);

test(
  "RoleGuard — 로그인하기 link href contains the URL-encoded current location",
  withCleanup(() => {
    renderAt(
      createElement(Guarded),
      makeAuth({ user: null, isLoading: false }),
      "/admin/companies",
    );
    const button = screen.getByText("로그인하기");
    const anchor = button.closest("a");
    assert.ok(anchor, "로그인하기 button should be wrapped in a link");
    const href = anchor.getAttribute("href") ?? "";
    assert.ok(
      href.includes(`/login?redirect=${encodeURIComponent("/admin/companies")}`),
      `href should carry the encoded current location, got: ${href}`,
    );
  }),
);

// ─── 2. Login page navigates to the redirect target after login ─────────────

const identityFixture = {
  identityId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  displayName: "가상 학생",
  roles: ["STUDENT"],
  scenarioLabel: "시나리오",
  description: "테스트용 가상 계정",
  defaultRoute: "/student/home",
};

/** Stub fetch so the login page's identity-list request resolves. */
function stubIdentityFetch(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: [identityFixture] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test(
  "Login — navigates to the decoded redirect param after a successful fake login",
  withCleanup(async () => {
    const restoreFetch = stubIdentityFetch();
    try {
      const memory = renderAt(
        createElement(Login),
        makeAuth({
          user: null,
          isLoading: false,
          loginWithFakeIdentity: async () => makeUser(),
        }),
        "/login",
        `redirect=${encodeURIComponent("/admin/companies")}`,
      );

      const loginButton = await screen.findByText("가상 로그인");
      fireEvent.click(loginButton);

      await waitFor(() => {
        assert.ok(
          memory.history.includes("/admin/companies"),
          `expected navigation to /admin/companies, history: ${memory.history.join(", ")}`,
        );
      });
    } finally {
      restoreFetch();
    }
  }),
);

test(
  "Login — falls back to the user's defaultRoute when no redirect param is present",
  withCleanup(async () => {
    const restoreFetch = stubIdentityFetch();
    try {
      const memory = renderAt(
        createElement(Login),
        makeAuth({
          user: null,
          isLoading: false,
          loginWithFakeIdentity: async () => makeUser({ defaultRoute: "/student/home" }),
        }),
        "/login",
      );

      const loginButton = await screen.findByText("가상 로그인");
      fireEvent.click(loginButton);

      await waitFor(() => {
        assert.ok(
          memory.history.includes("/student/home"),
          `expected navigation to /student/home, history: ${memory.history.join(", ")}`,
        );
      });
    } finally {
      restoreFetch();
    }
  }),
);

// ─── 3. Malformed / unsafe redirect values fall back to defaultRoute ─────────

async function loginAndExpectFallback(searchPath: string, rejected: string) {
  const restoreFetch = stubIdentityFetch();
  try {
    const memory = renderAt(
      createElement(Login),
      makeAuth({
        user: null,
        isLoading: false,
        loginWithFakeIdentity: async () => makeUser({ defaultRoute: "/student/home" }),
      }),
      "/login",
      searchPath,
    );

    const loginButton = await screen.findByText("가상 로그인");
    fireEvent.click(loginButton);

    await waitFor(() => {
      assert.ok(
        memory.history.includes("/student/home"),
        `expected fallback to /student/home, history: ${memory.history.join(", ")}`,
      );
    });
    // Ignore the initial /login?redirect=... entry — it necessarily contains
    // the raw param; only post-login navigations must avoid the rejected target.
    const navigations = memory.history.filter((entry) => !entry.startsWith("/login"));
    assert.ok(
      !navigations.some((entry) => entry.includes(rejected)),
      `history must not contain the rejected redirect target: ${memory.history.join(", ")}`,
    );
  } finally {
    restoreFetch();
  }
}

test(
  "Login — a malformed redirect (bad percent-encoding) falls back to defaultRoute",
  withCleanup(async () => {
    await loginAndExpectFallback("redirect=%E0%A4%A", "%E0%A4%A");
  }),
);

test(
  "Login — an absolute external redirect URL is ignored, falls back to defaultRoute",
  withCleanup(async () => {
    await loginAndExpectFallback(
      `redirect=${encodeURIComponent("https://evil.example/phish")}`,
      "evil.example",
    );
  }),
);

test(
  "Login — a protocol-relative redirect (//evil.example) is ignored",
  withCleanup(async () => {
    await loginAndExpectFallback(
      `redirect=${encodeURIComponent("//evil.example")}`,
      "evil.example",
    );
  }),
);

test(
  "Login — a javascript: scheme redirect is ignored",
  withCleanup(async () => {
    await loginAndExpectFallback(
      `redirect=${encodeURIComponent("javascript:alert(1)")}`,
      "javascript:",
    );
  }),
);

test(
  "Login — a backslash-prefixed redirect (/\\evil.example) is ignored",
  withCleanup(async () => {
    await loginAndExpectFallback(
      `redirect=${encodeURIComponent("/\\evil.example")}`,
      "evil.example",
    );
  }),
);

test(
  "Login — an already-authenticated visitor is sent to the redirect target immediately",
  withCleanup(async () => {
    const restoreFetch = stubIdentityFetch();
    try {
      const memory = renderAt(
        createElement(Login),
        makeAuth({ user: makeUser(), isLoading: false }),
        "/login",
        `redirect=${encodeURIComponent("/student/status")}`,
      );

      await waitFor(() => {
        assert.ok(
          memory.history.includes("/student/status"),
          `expected redirect to /student/status, history: ${memory.history.join(", ")}`,
        );
      });
    } finally {
      restoreFetch();
    }
  }),
);
