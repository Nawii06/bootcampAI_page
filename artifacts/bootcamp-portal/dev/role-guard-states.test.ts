/**
 * Component tests for the withRoleGuard HOC's four render branches:
 *   1. isLoading=true          → LoadingCard "세션 확인 중입니다…"
 *   2. user=null               → "로그인 필요" login prompt
 *   3. user without role       → "403 · 접근 권한 없음" message
 *   4. permitted user          → wrapped component renders
 *
 * `useAuth` is stubbed by rendering the guarded component inside a plain
 * `AuthContext.Provider`, so no module mocking is required.
 *
 * The DOM environment (happy-dom) is set up by `dev/setup-dom.ts`, which is
 * loaded via `--import` before this file is evaluated.
 * Pattern follows dev/session-warning-buttons.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { withRoleGuard } from "../src/components/RoleGuard.tsx";
import { AuthContext, type AuthContextType } from "../src/contexts/AuthContext.tsx";
import type { User } from "../src/types.ts";

function withCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
    }
  };
}

function makeUser(roles: string[]): User {
  return {
    id: "u-1",
    accountId: "acc-1",
    name: "테스트 사용자",
    role: "admin",
    roles,
    defaultRoute: "/admin/home",
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

function Wrapped(): ReactElement {
  return createElement("div", { "data-testid": "wrapped-content" }, "보호된 콘텐츠");
}

const Guarded = withRoleGuard(Wrapped, ["EMPLOYMENT_ADMIN"]);

function renderGuarded(auth: AuthContextType) {
  return render(
    createElement(AuthContext.Provider, { value: auth }, createElement(Guarded)),
  );
}

// ─── 1. Loading state ─────────────────────────────────────────────────────────

test(
  "withRoleGuard — shows the session-check LoadingCard while isLoading",
  withCleanup(() => {
    renderGuarded(makeAuth({ isLoading: true }));
    assert.ok(
      screen.getByText("세션 확인 중입니다…"),
      "LoadingCard message should be visible while the session is checked",
    );
    assert.equal(
      screen.queryByTestId("wrapped-content"),
      null,
      "wrapped component must not render while loading",
    );
  }),
);

// ─── 2. Unauthenticated state ─────────────────────────────────────────────────

test(
  "withRoleGuard — shows the login prompt when there is no user",
  withCleanup(() => {
    renderGuarded(makeAuth({ user: null, isLoading: false }));
    assert.ok(
      screen.getByText("로그인 필요"),
      '"로그인 필요" heading should be visible for unauthenticated users',
    );
    assert.ok(
      screen.getByText("이 화면은 로그인 후 이용할 수 있습니다."),
      "login explanation should be visible",
    );
    assert.equal(screen.queryByTestId("wrapped-content"), null);
  }),
);

// ─── 3. Forbidden state ───────────────────────────────────────────────────────

test(
  "withRoleGuard — shows the 403 message when the user lacks the required role",
  withCleanup(() => {
    renderGuarded(makeAuth({ user: makeUser(["STUDENT"]) }));
    assert.ok(
      screen.getByText("403 · 접근 권한 없음"),
      "403 badge should be visible for users without the required role",
    );
    assert.ok(
      screen.getByText("이 업무화면을 조회할 권한이 없습니다."),
      "403 heading should be visible",
    );
    assert.equal(screen.queryByTestId("wrapped-content"), null);
  }),
);

// ─── 4. Permitted user ────────────────────────────────────────────────────────

test(
  "withRoleGuard — renders the wrapped component for a permitted user",
  withCleanup(() => {
    renderGuarded(makeAuth({ user: makeUser(["EMPLOYMENT_ADMIN"]) }));
    assert.ok(
      screen.getByTestId("wrapped-content"),
      "wrapped component should render for a user with the required role",
    );
    assert.equal(screen.queryByText("403 · 접근 권한 없음"), null);
  }),
);

test(
  "withRoleGuard — SYSTEM_ADMIN bypasses the allowed-roles check",
  withCleanup(() => {
    renderGuarded(makeAuth({ user: makeUser(["SYSTEM_ADMIN"]) }));
    assert.ok(
      screen.getByTestId("wrapped-content"),
      "SYSTEM_ADMIN should be permitted on any guarded route",
    );
  }),
);
