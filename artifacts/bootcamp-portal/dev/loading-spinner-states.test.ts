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
 * ## ⚠️ Adding a new page? This file must be extended.
 *
 * Every new portal page needs a loading-state + loaded-state test here.
 * See `dev/TESTING.md` for the checklist and a copy-paste template.
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
import { render, screen, fireEvent } from "@testing-library/react";

// Shared setup + helpers (global DOM shims run on import). See dev/TESTING.md.
import {
  AUTH_LOADING,
  AUTH_ADMIN,
  AUTH_STUDENT,
  renderPage,
  withLoadingCleanup,
  withErrorCleanup,
  withCleanup,
} from "./page-test-utils.ts";

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

// ─── Error states ─────────────────────────────────────────────────────────────
// Each test installs a fetch stub that rejects immediately, so every query
// (retry: 0) lands in isError=true. We assert a meaningful ErrorCard message
// and a retry button — never a blank page.

test(
  "Curriculum — shows ErrorCard with retry when the courses query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(Curriculum), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("교육과정 API에 연결할 수 없습니다."),
      "Curriculum should show a helpful error message when the courses query fails",
    );
    assert.ok(
      screen.queryByText("다시 시도"),
      "Curriculum should show a retry button on error",
    );
    assert.ok(
      !screen.queryByText("교육과정을 불러오는 중입니다."),
      "Curriculum should not remain in loading state after the query fails",
    );
  }),
);

test(
  "Resources — shows ErrorCard with retry when the resources query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(Resources), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("자료실 API에 연결할 수 없습니다."),
      "Resources should show a helpful error message when the resources query fails",
    );
    assert.ok(
      screen.queryByText("다시 시도"),
      "Resources should show a retry button on error",
    );
  }),
);

test(
  "StudentStatus — shows ErrorCards when both queries fail",
  withErrorCleanup(async () => {
    renderPage(createElement(StudentStatus), { auth: AUTH_STUDENT });
    assert.ok(
      await screen.findByText("신청현황 API에 연결할 수 없습니다."),
      "StudentStatus should show an error message when the applications query fails",
    );
    assert.ok(
      await screen.findByText("채용·연계 이력을 불러오지 못했습니다."),
      "StudentStatus should show an error message when the employment-links query fails",
    );
    const retryButtons = screen.queryAllByText("다시 시도");
    assert.ok(
      retryButtons.length >= 2,
      "StudentStatus should show retry buttons for both failed queries",
    );
  }),
);

test(
  "PartnerEmployment — shows ErrorCard with retry when the years query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(PartnerEmployment), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("API에 연결할 수 없습니다."),
      "PartnerEmployment should show a helpful error message when initial data fails to load",
    );
    assert.ok(
      screen.queryByText("다시 시도"),
      "PartnerEmployment should show a retry button on error",
    );
    assert.ok(
      !screen.queryByText("데이터를 불러오는 중입니다."),
      "PartnerEmployment should not remain in loading state after the query fails",
    );
  }),
);

test(
  "AdminBenefits — shows ErrorCard with retry when benefit-operations query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminBenefits), { auth: AUTH_ADMIN });
    // ErrorCard renders error.message plus its standard guidance line.
    assert.ok(
      await screen.findByText("API 서버 또는 네트워크 연결 상태를 확인해 주세요."),
      "AdminBenefits should show the ErrorCard guidance message when the query fails",
    );
    assert.ok(
      screen.queryByText("다시 시도"),
      "AdminBenefits should show a retry button on error",
    );
    assert.ok(
      !screen.queryByText("수혜업무를 불러오는 중입니다."),
      "AdminBenefits should not remain in loading state after the query fails",
    );
  }),
);

test(
  "AdminContent — shows ErrorCard with retry when the content query fails",
  withErrorCleanup(async () => {
    renderPage(createElement(AdminContent), { auth: AUTH_ADMIN });
    assert.ok(
      await screen.findByText("API 서버 또는 네트워크 연결 상태를 확인해 주세요."),
      "AdminContent should show the ErrorCard guidance message when the content query fails",
    );
    assert.ok(
      screen.queryByText("다시 시도"),
      "AdminContent should show a retry button on error",
    );
  }),
);
