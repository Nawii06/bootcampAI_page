/**
 * Shared helpers for page loading/error-state tests.
 *
 * Importing this module performs the one-time global setup (happy-dom
 * forwarding, sessionStorage shim, __FAKE_DATA_SET__) and exports:
 *   - fetch stubs: installLoadingFetch / removeLoadingFetch,
 *     installErrorFetch / removeErrorFetch
 *   - mock auth values: AUTH_LOADING, AUTH_ADMIN, AUTH_STUDENT, AUTH_PARTNER
 *   - renderPage() and the withLoadingCleanup / withErrorCleanup /
 *     withCleanup test wrappers
 *
 * See dev/TESTING.md for the full testing pattern.
 */
import { createElement } from "react";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContext } from "../src/contexts/AuthContext.tsx";

// ─── One-time global setup ────────────────────────────────────────────────────

// Vite's `define` normally injects this constant at build time.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// wouter (and some Radix UI primitives) call addEventListener / removeEventListener
// as bare globals, not as window.addEventListener. happy-dom attaches these to
// its Window object but NOT to Node's globalThis, so we forward them.
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

// useFormDraft reads `sessionStorage` without a `window.` prefix; happy-dom
// exposes it on the window object but not on Node's globalThis.
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

// Radix primitives (@radix-ui/react-use-size) require ResizeObserver, which
// happy-dom does not implement. Provide a no-op shim.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// ─── Per-test fetch stub helpers ──────────────────────────────────────────────

/**
 * Tracks reject callbacks for every Promise created by the loading-state stub
 * so they can all be settled in cleanup (allowing the event loop to drain).
 */
type RejectFn = (reason: Error) => void;
let _pendingRejects: RejectFn[] = [];
const _originalFetch = globalThis.fetch;

/** Install a fetch stub that keeps every call pending indefinitely. */
export function installLoadingFetch(): void {
  _pendingRejects = [];
  globalThis.fetch = (): Promise<Response> =>
    new Promise<Response>((_resolve, reject) => {
      _pendingRejects.push(reject);
    });
}

/**
 * Reject all outstanding stub fetch Promises and restore the original fetch.
 * Call this AFTER cleanup() so no React components are mounted when
 * React Query processes the resulting error state.
 */
export function removeLoadingFetch(): void {
  for (const reject of _pendingRejects) {
    reject(new Error("test-fetch-cleanup"));
  }
  _pendingRejects = [];
  globalThis.fetch = _originalFetch;
}

/**
 * Install a fetch stub that rejects immediately, driving every useQuery
 * (with retry: 0) straight into its error state.
 */
export function installErrorFetch(): void {
  globalThis.fetch = (): Promise<Response> =>
    Promise.reject(new Error("test-network-failure"));
}

/** Restore the original fetch after an error-state test. */
export function removeErrorFetch(): void {
  globalThis.fetch = _originalFetch;
}

// ─── Mock auth values ─────────────────────────────────────────────────────────

export const AUTH_LOADING = {
  user: null,
  isLoading: true,
  logout: async () => {},
  refreshSession: async () => null as never,
  loginWithFakeIdentity: async (): Promise<never> => {
    throw new Error("stub");
  },
  hasPermission: (_roles: string[]) => false,
};

const ADMIN_USER = {
  id: "usr-admin",
  accountId: "acc-admin",
  name: "테스트 관리자",
  role: "superAdmin" as const,
  roles: ["SYSTEM_ADMIN"],
  defaultRoute: "/admin/dashboard",
};

export const AUTH_ADMIN = {
  user: ADMIN_USER,
  isLoading: false,
  logout: async () => {},
  refreshSession: async () => ADMIN_USER,
  loginWithFakeIdentity: async () => ADMIN_USER,
  hasPermission: (roles: string[]) =>
    ADMIN_USER.roles.some((r) => roles.includes(r)),
};

const STUDENT_USER = {
  id: "usr-student",
  accountId: "acc-student",
  name: "테스트 학생",
  role: "student" as const,
  roles: ["STUDENT"],
};

export const AUTH_STUDENT = {
  user: STUDENT_USER,
  isLoading: false,
  logout: async () => {},
  refreshSession: async () => STUDENT_USER,
  loginWithFakeIdentity: async () => STUDENT_USER,
  hasPermission: (roles: string[]) =>
    STUDENT_USER.roles.some((r) => roles.includes(r)),
};

const PARTNER_USER = {
  id: "usr-partner",
  accountId: "acc-partner",
  name: "테스트 파트너",
  role: "partner" as const,
  roles: ["PARTNER"],
};

export const AUTH_PARTNER = {
  user: PARTNER_USER,
  isLoading: false,
  logout: async () => {},
  refreshSession: async () => PARTNER_USER,
  loginWithFakeIdentity: async () => PARTNER_USER,
  hasPermission: (roles: string[]) =>
    PARTNER_USER.roles.some((r) => roles.includes(r)),
};

// ─── Render helpers ───────────────────────────────────────────────────────────

export type AuthValue =
  | typeof AUTH_ADMIN
  | typeof AUTH_STUDENT
  | typeof AUTH_PARTNER
  | typeof AUTH_LOADING;

export interface RenderOptions {
  auth?: AuthValue;
  /** Cache entries to pre-populate so matching queries skip the network. */
  queryData?: Array<{ queryKey: unknown[]; data: unknown }>;
}

/**
 * Renders `component` inside AuthContext.Provider + QueryClientProvider.
 * Any query key absent from `queryData` will remain in isLoading=true
 * (assuming installLoadingFetch() has been called beforehand).
 */
export function renderPage(
  component: ReturnType<typeof createElement>,
  options: RenderOptions = {},
): ReturnType<typeof render> {
  const { auth = AUTH_ADMIN, queryData = [] } = options;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 0 } },
  });
  for (const { queryKey, data } of queryData) {
    client.setQueryData(queryKey, data);
  }
  return render(
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client }, component),
    ),
  );
}

/**
 * Wraps a "loading state" test body:
 *   1. Installs the never-settling fetch stub.
 *   2. Runs `fn`.
 *   3. Unmounts via cleanup().
 *   4. Rejects all pending stub Promises so the event loop can drain.
 */
export function withLoadingCleanup(fn: () => void | Promise<void>) {
  return async () => {
    installLoadingFetch();
    try {
      await fn();
    } finally {
      cleanup();
      removeLoadingFetch();
    }
  };
}

/**
 * Wraps an "error state" test body:
 *   1. Installs the immediately-rejecting fetch stub.
 *   2. Runs `fn` (which should await the error UI via findByText).
 *   3. Unmounts via cleanup() and restores the original fetch.
 */
export function withErrorCleanup(fn: () => void | Promise<void>) {
  return async () => {
    installErrorFetch();
    try {
      await fn();
    } finally {
      cleanup();
      removeErrorFetch();
    }
  };
}

/** Wraps a "loaded state" test body — no fetch override needed. */
export function withCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
    }
  };
}
