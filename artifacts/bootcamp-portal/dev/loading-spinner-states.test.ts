/**
 * Automated tests verifying LoadingCard appears correctly during loading states
 * and disappears once data resolves, across:
 *
 *   - LoadingCard component itself
 *   - RoleGuard (withRoleGuard HOC) — session loading
 *   - PortalLayout              — session loading
 *   - Public pages: Curriculum, Resources
 *   - Student pages: Status
 *   - Partner pages: Employment
 *   - Admin pages:  Benefits, Content
 *
 * ## Strategy
 *
 * `mock.module()` is not available in this runtime. Instead we use three
 * complementary techniques:
 *
 * 1. **Auth context injection**: `AuthContext` is exported from the source so
 *    tests can wrap components in `<AuthContext.Provider value={mockAuth}>`.
 *
 * 2. **Per-test fetch override for loading state**: A helper swaps
 *    `globalThis.fetch` with a never-settling stub before rendering and
 *    rejects all pending fetch Promises (allowing them to settle cleanly)
 *    in the finally block. This keeps every `useQuery` call in
 *    `isLoading: true` during the assertion and lets the event loop drain
 *    once cleanup finishes — leaving the global fetch untouched for other
 *    test files.
 *
 * 3. **`setQueryData` for loaded state**: A fresh `QueryClient` is created per
 *    test; `setQueryData` pre-populates the cache so the relevant query
 *    immediately reports `isLoading: false` without touching the network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// AuthContext is exported from the source so we can inject mock auth values.
import { AuthContext } from "../src/contexts/AuthContext.tsx";

// Static imports — no mock.module() required.
import { LoadingCard } from "../src/components/LoadingCard.tsx";
import { withRoleGuard } from "../src/components/RoleGuard.tsx";
import { PortalLayout } from "../src/components/PortalLayout.tsx";
import Curriculum from "../src/pages/public/curriculum.tsx";
import Resources from "../src/pages/public/resources.tsx";
import StudentStatus from "../src/pages/student/status.tsx";
import PartnerEmployment from "../src/pages/partner/employment.tsx";
import AdminBenefits from "../src/pages/admin/benefits.tsx";
import AdminContent from "../src/pages/admin/content.tsx";

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

// ─── Per-test fetch stub helpers ──────────────────────────────────────────────

/**
 * Tracks reject callbacks for every Promise created by the loading-state stub
 * so they can all be settled in cleanup (allowing the event loop to drain).
 */
type RejectFn = (reason: Error) => void;
let _pendingRejects: RejectFn[] = [];
const _originalFetch = globalThis.fetch;

/** Install a fetch stub that keeps every call pending indefinitely. */
function installLoadingFetch(): void {
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
function removeLoadingFetch(): void {
  for (const reject of _pendingRejects) {
    reject(new Error("test-fetch-cleanup"));
  }
  _pendingRejects = [];
  globalThis.fetch = _originalFetch;
}

// ─── Mock auth values ─────────────────────────────────────────────────────────

const AUTH_LOADING = {
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

const AUTH_ADMIN = {
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

const AUTH_STUDENT = {
  user: STUDENT_USER,
  isLoading: false,
  logout: async () => {},
  refreshSession: async () => STUDENT_USER,
  loginWithFakeIdentity: async () => STUDENT_USER,
  hasPermission: (roles: string[]) =>
    STUDENT_USER.roles.some((r) => roles.includes(r)),
};

// ─── Render helpers ───────────────────────────────────────────────────────────

type AuthValue = typeof AUTH_ADMIN | typeof AUTH_STUDENT | typeof AUTH_LOADING;

interface RenderOptions {
  auth?: AuthValue;
  /** Cache entries to pre-populate so matching queries skip the network. */
  queryData?: Array<{ queryKey: unknown[]; data: unknown }>;
}

/**
 * Renders `component` inside AuthContext.Provider + QueryClientProvider.
 * Any query key absent from `queryData` will remain in isLoading=true
 * (assuming installLoadingFetch() has been called beforehand).
 */
function renderPage(
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
function withLoadingCleanup(fn: () => void | Promise<void>) {
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

/** Wraps a "loaded state" test body — no fetch override needed. */
function withCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
    }
  };
}

// ─── LoadingCard component ────────────────────────────────────────────────────

test(
  "LoadingCard — renders default message",
  withCleanup(() => {
    render(createElement(LoadingCard));
    assert.ok(
      screen.queryByText("불러오는 중입니다…"),
      "LoadingCard should display its default message",
    );
  }),
);

test(
  "LoadingCard — renders a custom message",
  withCleanup(() => {
    render(createElement(LoadingCard, { message: "사용자 정의 메시지" }));
    assert.ok(
      screen.queryByText("사용자 정의 메시지"),
      "LoadingCard should display the custom message",
    );
  }),
);

test(
  "LoadingCard — contains an animate-spin SVG icon",
  withCleanup(() => {
    const { container } = render(createElement(LoadingCard));
    const svg = container.querySelector("svg");
    assert.ok(svg, "LoadingCard should render an SVG element");
    assert.ok(
      svg.classList.contains("animate-spin"),
      "The spinner SVG should carry the animate-spin class",
    );
  }),
);

// ─── RoleGuard (withRoleGuard HOC) ────────────────────────────────────────────
// RoleGuard reads only from AuthContext — no useQuery, no fetch needed.

function AnyPage() {
  return createElement("span", null, "보호된 페이지 콘텐츠");
}
const GuardedPage = withRoleGuard(AnyPage, ["STUDENT"]);

test(
  "RoleGuard — shows LoadingCard while session is loading",
  withCleanup(() => {
    render(
      createElement(AuthContext.Provider, { value: AUTH_LOADING },
        createElement(GuardedPage),
      ),
    );
    assert.ok(
      screen.queryByText("세션 확인 중입니다…"),
      "RoleGuard should show the session-check LoadingCard while auth is loading",
    );
    assert.ok(
      !screen.queryByText("보호된 페이지 콘텐츠"),
      "RoleGuard should not render the wrapped page while auth is loading",
    );
  }),
);

test(
  "RoleGuard — hides LoadingCard once session is confirmed",
  withCleanup(() => {
    render(
      createElement(AuthContext.Provider, { value: AUTH_STUDENT },
        createElement(GuardedPage),
      ),
    );
    assert.ok(
      !screen.queryByText("세션 확인 중입니다…"),
      "RoleGuard should hide LoadingCard after session is confirmed",
    );
    assert.ok(
      screen.queryByText("보호된 페이지 콘텐츠"),
      "RoleGuard should render the wrapped page after session is confirmed",
    );
  }),
);

// ─── PortalLayout ─────────────────────────────────────────────────────────────
// PortalLayout reads only from AuthContext — no useQuery, no fetch needed.

test(
  "PortalLayout — shows LoadingCard while session is loading",
  withCleanup(() => {
    render(
      createElement(AuthContext.Provider, { value: AUTH_LOADING },
        createElement(PortalLayout, null,
          createElement("span", null, "레이아웃 자식"),
        ),
      ),
    );
    assert.ok(
      screen.queryByText("세션 확인 중입니다…"),
      "PortalLayout should show the session-check LoadingCard while auth is loading",
    );
    assert.ok(
      !screen.queryByText("레이아웃 자식"),
      "PortalLayout should not render children while auth is loading",
    );
  }),
);

test(
  "PortalLayout — hides LoadingCard once session is confirmed",
  withCleanup(() => {
    render(
      createElement(AuthContext.Provider, { value: AUTH_ADMIN },
        createElement(PortalLayout, null,
          createElement("span", null, "레이아웃 자식"),
        ),
      ),
    );
    assert.ok(
      !screen.queryByText("세션 확인 중입니다…"),
      "PortalLayout should hide LoadingCard after session is confirmed",
    );
    assert.ok(
      screen.queryByText("레이아웃 자식"),
      "PortalLayout should render children after session is confirmed",
    );
  }),
);

// ─── Curriculum page ──────────────────────────────────────────────────────────

test(
  "Curriculum — shows LoadingCard while courses query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(Curriculum), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("교육과정을 불러오는 중입니다."),
      "Curriculum should show LoadingCard while the courses query is loading",
    );
  }),
);

test(
  "Curriculum — hides LoadingCard once courses are loaded",
  withCleanup(() => {
    renderPage(createElement(Curriculum), {
      auth: AUTH_ADMIN,
      queryData: [{ queryKey: ["public", "courses"], data: { data: [] } }],
    });
    assert.ok(
      !screen.queryByText("교육과정을 불러오는 중입니다."),
      "Curriculum should hide LoadingCard after courses are loaded",
    );
  }),
);

// ─── Resources page ───────────────────────────────────────────────────────────

test(
  "Resources — shows LoadingCard while resources query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(Resources), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("공개 자료를 불러오는 중입니다."),
      "Resources should show LoadingCard while the resources query is loading",
    );
  }),
);

test(
  "Resources — hides LoadingCard once resources are loaded",
  withCleanup(() => {
    renderPage(createElement(Resources), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["public", "content", "RESOURCE"],
          data: { data: [], meta: { total: 0 } },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("공개 자료를 불러오는 중입니다."),
      "Resources should hide LoadingCard after resources are loaded",
    );
  }),
);

// ─── Student status page ──────────────────────────────────────────────────────
// Note: StudentStatus uses Skeleton rows (not LoadingCard) for its loading state.

test(
  "StudentStatus — shows skeleton rows while queries are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(StudentStatus), {
      auth: AUTH_STUDENT,
      // Neither query pre-loaded → both isLoading=true → Skeleton rows shown
    });
    const skeletons = container.querySelectorAll(".animate-pulse");
    assert.ok(
      skeletons.length > 0,
      "StudentStatus should show skeleton rows (animate-pulse elements) while data is loading",
    );
  }),
);

test(
  "StudentStatus — hides skeleton rows once both queries are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(StudentStatus), {
      auth: AUTH_STUDENT,
      queryData: [
        {
          queryKey: ["program-applications", "usr-student"],
          data: { data: [] },
        },
        {
          queryKey: ["student", "employment-links", "usr-student"],
          data: { data: [] },
        },
      ],
    });
    const skeletons = container.querySelectorAll(".animate-pulse");
    assert.equal(
      skeletons.length,
      0,
      "StudentStatus should have no skeleton rows once both queries are loaded",
    );
  }),
);

// ─── Partner employment page ──────────────────────────────────────────────────

test(
  "PartnerEmployment — shows LoadingCard while initial data is loading",
  withLoadingCleanup(() => {
    // years not pre-loaded → years.isLoading=true → derived isLoading=true
    renderPage(createElement(PartnerEmployment), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("데이터를 불러오는 중입니다."),
      "PartnerEmployment should show LoadingCard while initial data is loading",
    );
  }),
);

test(
  "PartnerEmployment — hides LoadingCard once data is loaded",
  withCleanup(() => {
    // years resolved with empty list → yearId=undefined → isLoading=false
    renderPage(createElement(PartnerEmployment), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("데이터를 불러오는 중입니다."),
      "PartnerEmployment should hide LoadingCard once data is loaded",
    );
  }),
);

// ─── Admin benefits page ──────────────────────────────────────────────────────

test(
  "AdminBenefits — shows LoadingCard while benefit-operations are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminBenefits), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("수혜업무를 불러오는 중입니다."),
      "AdminBenefits should show LoadingCard while benefit operations are loading",
    );
  }),
);

test(
  "AdminBenefits — hides LoadingCard once operations are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminBenefits), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["admin", "benefit-operations"],
          data: {
            policies: [],
            candidates: [],
            students: [],
            approvals: [],
            payments: [],
          },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("수혜업무를 불러오는 중입니다."),
      "AdminBenefits should hide LoadingCard once operations are loaded",
    );
  }),
);

// ─── Admin content page ───────────────────────────────────────────────────────

const SAMPLE_CONTENT_ITEM = {
  id: "content-test-1",
  contentType: "NOTICE",
  title: "테스트 공지사항",
  slug: "test-notice",
  status: "DRAFT",
  body: "테스트 본문입니다.",
  isPinned: false,
  publishedAt: null,
};

test(
  "AdminContent — shows LoadingCard in versions panel while versions are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminContent), {
      auth: AUTH_ADMIN,
      queryData: [
        // Content list loaded so the article row with "버전 이력" button renders
        {
          queryKey: ["admin", "content"],
          data: { data: [SAMPLE_CONTENT_ITEM], attachments: [] },
        },
        // Stored-files loaded (canEdit=true enables this query)
        { queryKey: ["admin", "stored-files", "content"], data: { data: [] } },
        // versions NOT pre-loaded → after clicking, fetch never settles
        // → versions.isLoading=true → LoadingCard appears
      ],
    });

    // "버전 이력" is always visible; clicking sets historyContentId which
    // enables the versions query (currently in loading state).
    fireEvent.click(screen.getByText("버전 이력"));

    assert.ok(
      screen.queryByText("버전 이력을 불러오는 중입니다."),
      "AdminContent should show LoadingCard in the versions panel while versions are loading",
    );
  }),
);

test(
  "AdminContent — hides LoadingCard in versions panel once versions are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminContent), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["admin", "content"],
          data: { data: [SAMPLE_CONTENT_ITEM], attachments: [] },
        },
        { queryKey: ["admin", "stored-files", "content"], data: { data: [] } },
        // Versions pre-loaded → isLoading=false after enabling
        {
          queryKey: ["admin", "content-versions", SAMPLE_CONTENT_ITEM.id],
          data: { data: [] },
        },
      ],
    });

    fireEvent.click(screen.getByText("버전 이력"));

    assert.ok(
      !screen.queryByText("버전 이력을 불러오는 중입니다."),
      "AdminContent should hide LoadingCard in the versions panel once versions are loaded",
    );
  }),
);
