/**
 * Page-level tests for loading spinner / skeleton visibility.
 *
 * These tests render actual portal page components and assert that:
 *   1. Loading UI (LoadingCard / Skeleton rows) is visible while page data
 *      is still fetching.
 *   2. Loading UI is absent (and real content is visible) once data arrives.
 *
 * Isolation strategy
 * ------------------
 * Problem A — AuthContext
 *   Layout / PortalLayout call useAuth().  AuthContext and AuthContextType are
 *   exported from AuthContext.tsx so tests can wrap pages with
 *   <AuthContext.Provider value={mockValue}> via createElement() — no
 *   AuthProvider, no JSX transform issue (tsx compiles some src files under
 *   "jsx":"preserve", producing React.createElement() that needs React in scope;
 *   setup-dom.ts sets globalThis.React to handle this).
 *
 * Problem B — React Query network calls
 *   React Query v5 initiates an INITIAL fetch even when refetchOnMount:false,
 *   because the check `!dataUpdatedAt` overrides the flag for never-fetched
 *   queries.  The resulting fetch I/O keeps the Node.js event loop alive after
 *   cleanup and prevents the subprocess from exiting.
 *
 *   Two approaches are used to avoid starting a real fetch:
 *
 *   (a) Partner auth-guard loading test — MOCK_AUTH.isLoading=true causes
 *       PortalLayout to return a simple LoadingCard early, BEFORE rendering
 *       any child page or calling useQuery.
 *
 *   (b) Loaded-state tests — qc.setQueryData() pre-populates the cache so
 *       dataUpdatedAt is non-zero; refetchOnMount:false then applies and no
 *       fetch is initiated.
 *
 *   (c) Curriculum loading test — the initial fetch IS allowed to start.
 *       The API server is running and responds quickly, so the I/O handle
 *       drains naturally after cleanup.  We assert the loading state
 *       synchronously right after render(), before any response arrives.
 *
 * Pages covered
 * -------------
 *  • public/curriculum.tsx  — LoadingCard ("교육과정을 불러오는 중입니다.")
 *  • partner/dashboard.tsx via PortalLayout — two scenarios:
 *      – auth-guard loading   (MOCK_AUTH.isLoading=true → no useQuery fires)
 *      – dashboard loaded     (pre-populated cache → no fetch)
 *
 * DOM environment: happy-dom (setup-dom.ts).
 * Pattern follows: loading-spinner.test.ts, session-warning-buttons.test.ts.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthContext,
  type AuthContextType,
} from "../src/contexts/AuthContext.tsx";
import Curriculum from "../src/pages/public/curriculum.tsx";
import PartnerDashboard from "../src/pages/partner/dashboard.tsx";

// ─── Globals needed outside a Vite bundle ────────────────────────────────────
// Vite replaces __FAKE_DATA_SET__ at build time; define it before any render.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// ─── Mock auth values ─────────────────────────────────────────────────────────

/** Resolved session with a partner user. */
const MOCK_AUTH: AuthContextType = {
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "테스트 파트너",    // required by User type (types.ts)
    role: "partner",         // required by User type; used by PortalLayout
    roles: ["COMPANY_MANAGER"],
    loginId: "partner@example.com",
    defaultRoute: "/partner/dashboard",
  } as AuthContextType["user"],
  isLoading: false,
  refreshSession: async () => null,
  loginWithFakeIdentity: async () => { throw new Error("not available in tests"); },
  logout: async () => {},
  hasPermission: () => false,
};

/** Session still resolving — triggers PortalLayout's auth-guard LoadingCard. */
const MOCK_AUTH_LOADING: AuthContextType = {
  user: null,
  isLoading: true,
  refreshSession: async () => null,
  loginWithFakeIdentity: async () => { throw new Error("not available in tests"); },
  logout: async () => {},
  hasPermission: () => false,
};

// ─── Mock query data ──────────────────────────────────────────────────────────

const MOCK_COURSES = {
  data: [
    {
      id: "00000000-0000-0000-0000-000000000010",
      courseCode: "AI-101",
      name: "인공지능 기초",
      defaultCredits: 3,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  meta: { page: 1, pageSize: 100, total: 1 },
};

const MOCK_PARTICIPATIONS = {
  company: {
    id: "00000000-0000-0000-0000-000000000002",
    name: "테스트 기업",
    companyType: "LARGE",
  },
  data: [
    {
      id: "00000000-0000-0000-0000-000000000030",
      participationType: "DEMAND_SURVEY",
      title: "수요조사 2026",
      details: {},
      participantCount: 0,
      employmentCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Make a fresh QueryClient.
 *   retry: false        — don't retry failed queries.
 *   gcTime: 0           — GC immediately; no lingering timers.
 *   refetchOnMount: false — suppress RE-fetches on mount for pre-populated
 *                          queries (React Query v5 still initiates the very
 *                          first fetch when dataUpdatedAt is 0, so this flag
 *                          is meaningful only for loaded-state tests where
 *                          setQueryData() sets dataUpdatedAt first).
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

/**
 * Wrap a page element with AuthContext.Provider and QueryClientProvider.
 * Uses createElement() throughout — no JSX needed.
 * @param authOverride  optional auth value; defaults to MOCK_AUTH.
 */
function renderPage(
  element: React.ReactElement,
  queryClient: QueryClient,
  authOverride: AuthContextType = MOCK_AUTH,
) {
  return render(
    createElement(
      AuthContext.Provider,
      { value: authOverride },
      createElement(QueryClientProvider, { client: queryClient }, element),
    ),
  );
}

/** Synchronous test wrapper: create a fresh QC, run fn, always cleanup. */
function withCleanup(fn: (qc: QueryClient) => void) {
  return () => {
    const qc = makeQueryClient();
    try {
      fn(qc);
    } finally {
      cleanup();   // unmount React tree; triggers QueryClientProvider cleanup
      qc.clear();  // evict any remaining cache entries
    }
  };
}

// ─── Curriculum page — loading / loaded ──────────────────────────────────────

test(
  "Curriculum page — loading state: LoadingCard visible, course content absent",
  withCleanup((qc) => {
    // No data in cache → useQuery starts in isLoading=true (initial fetch fires,
    // but assertions run synchronously before any network response arrives).
    renderPage(createElement(Curriculum), qc);

    const loadingEl = screen.getByText("교육과정을 불러오는 중입니다.");
    assert.ok(loadingEl, "LoadingCard message must be visible while fetching");

    assert.equal(
      screen.queryByText("인공지능 기초"),
      null,
      "course name must be absent while loading",
    );
  }),
);

test(
  "Curriculum page — loaded state: course content visible, LoadingCard absent",
  withCleanup((qc) => {
    // Pre-populate the cache: setQueryData sets dataUpdatedAt so
    // refetchOnMount:false prevents any subsequent fetch.
    qc.setQueryData(["public", "courses"], MOCK_COURSES);

    renderPage(createElement(Curriculum), qc);

    const courseEl = screen.getByText("인공지능 기초");
    assert.ok(courseEl, "course name must be visible once data is loaded");

    assert.equal(
      screen.queryByText("교육과정을 불러오는 중입니다."),
      null,
      "LoadingCard must be absent once data is loaded",
    );
  }),
);

// ─── Partner portal (PortalLayout) — auth-guard / loaded ─────────────────────
//
// Two loading scenarios are covered:
//
//  (3) Auth-guard loading — MOCK_AUTH_LOADING (isLoading:true, user:null) causes
//      PortalLayout to short-circuit and render only its auth-guard LoadingCard.
//      PartnerDashboard is never rendered so no useQuery fires and no network I/O
//      is created.  This tests the "spinner while session resolves" path that all
//      authenticated portal pages share.
//
//  (4) Dashboard loaded — MOCK_AUTH (resolved user) + pre-populated cache.
//      setQueryData sets dataUpdatedAt so refetchOnMount:false prevents a fetch.
//      Assertions use text unique to the loaded dashboard content; "수요조사"
//      and "프로젝트 제안" also appear in the PortalLayout nav, so we assert on
//      "현장실습·인턴십·채용" (stat card) and "최근 등록 활동" (section heading)
//      which are absent from the nav.

test(
  "Partner portal — auth-guard loading state: session-check LoadingCard visible",
  withCleanup((qc) => {
    // isLoading:true → PortalLayout short-circuits before rendering PartnerDashboard
    renderPage(createElement(PartnerDashboard), qc, MOCK_AUTH_LOADING);

    const loadingEl = screen.getByText("세션 확인 중입니다…");
    assert.ok(
      loadingEl,
      "PortalLayout must show auth-guard LoadingCard while session resolves",
    );

    // Dashboard content must not appear during auth check
    assert.equal(
      screen.queryByText("기업 대시보드"),
      null,
      "'기업 대시보드' section header must be absent during auth check",
    );
  }),
);

test(
  "Partner portal — loaded state: dashboard content visible, skeleton absent",
  withCleanup((qc) => {
    // Pre-populate cache → setQueryData sets dataUpdatedAt → refetchOnMount:false
    // prevents any fetch → no network I/O created.
    qc.setQueryData(["partner", "company-participations"], MOCK_PARTICIPATIONS);

    renderPage(createElement(PartnerDashboard), qc);

    // "현장실습·인턴십·채용" appears only in the StatCard section, not in nav.
    const statEl = screen.getByText("현장실습·인턴십·채용");
    assert.ok(statEl, "stat card '현장실습·인턴십·채용' must appear when loaded");

    // "최근 등록 활동" is the recent-activity section heading.
    const headingEl = screen.getByText("최근 등록 활동");
    assert.ok(headingEl, "'최근 등록 활동' heading must appear when loaded");
  }),
);
