/**
 * Automated tests verifying LoadingCard appears correctly during loading states
 * and disappears once data resolves, across:
 *
 *   - LoadingCard component itself
 *   - RoleGuard (withRoleGuard HOC) — session loading
 *   - PortalLayout              — session loading
 *   - Public pages: Curriculum, Resources, Portfolio
 *   - Student pages: Status, Portfolio
 *   - Partner pages: Employment, Dashboard, Project, Survey
 *   - Admin pages:  Benefits, Content, Dashboard, Employment, Partners
 *
 * ...and every other query-driven page under src/pages/ (admin, partner,
 * public, student). The only pages without a loading-state test are fully
 * static ones with no on-mount query (e.g. public/intro).
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
  AUTH_PARTNER,
  renderPage,
  withLoadingCleanup,
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
import PublicPortfolio from "../src/pages/public/portfolio.tsx";
import StudentPortfolio from "../src/pages/student/portfolio.tsx";
import PartnerDashboard from "../src/pages/partner/dashboard.tsx";
import PartnerProject from "../src/pages/partner/project.tsx";
import PartnerSurvey from "../src/pages/partner/survey.tsx";
import AdminDashboard from "../src/pages/admin/dashboard.tsx";
import AdminEmployment from "../src/pages/admin/employment.tsx";
import AdminPartners from "../src/pages/admin/partners.tsx";
import AdminPerformanceDashboard from "../src/pages/admin/performance-dashboard.tsx";
import AdminPerformanceEvidence from "../src/pages/admin/performance-evidence.tsx";
import AdminPerformanceExport from "../src/pages/admin/performance-export.tsx";
import AdminPerformanceIndicators from "../src/pages/admin/performance-indicators.tsx";
import AdminPerformanceResults from "../src/pages/admin/performance-results.tsx";
import AdminPerformanceSourceData from "../src/pages/admin/performance-source-data.tsx";
import AdminAcademics from "../src/pages/admin/academics.tsx";
import AdminApplications from "../src/pages/admin/applications.tsx";
import AdminAuditLogs from "../src/pages/admin/audit-logs.tsx";
import AdminBudgetLog from "../src/pages/admin/budget-log.tsx";
import AdminBudget from "../src/pages/admin/budget.tsx";
import AdminCompletion from "../src/pages/admin/completion.tsx";
import AdminEvaluation from "../src/pages/admin/evaluation.tsx";
import AdminEvidence from "../src/pages/admin/evidence.tsx";
import AdminPreviewOperations from "../src/pages/admin/preview-operations.tsx";
import AdminProgramOperations from "../src/pages/admin/program-operations.tsx";
import AdminPrograms from "../src/pages/admin/programs.tsx";
import AdminSettings from "../src/pages/admin/settings.tsx";
import PartnerApplication from "../src/pages/partner/application.tsx";
import PartnerEvaluation from "../src/pages/partner/evaluation.tsx";
import Home from "../src/pages/public/home.tsx";
import Partners from "../src/pages/public/partners.tsx";
import Performance from "../src/pages/public/performance.tsx";
import Recruitment from "../src/pages/public/recruitment.tsx";
import StudentApply from "../src/pages/student/apply.tsx";
import StudentCompletion from "../src/pages/student/completion.tsx";
import StudentDashboard from "../src/pages/student/dashboard.tsx";
import StudentLearning from "../src/pages/student/learning.tsx";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

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

// ─── Public portfolio page ────────────────────────────────────────────────────
// Reads :token via wouter useParams, so tests mount it inside a memory Router.

function renderPortfolioAt(token: string, queryData: Array<{ queryKey: unknown[]; data: unknown }> = []) {
  const { hook } = memoryLocation({ path: `/portfolio/${token}` });
  return renderPage(
    createElement(
      Router,
      { hook },
      createElement(Route, { path: "/portfolio/:token" }, createElement(PublicPortfolio)),
    ),
    { auth: AUTH_ADMIN, queryData },
  );
}

test(
  "PublicPortfolio — shows skeletons while the portfolio query is loading",
  withLoadingCleanup(() => {
    const { container } = renderPortfolioAt("tok-1");
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "PublicPortfolio should show skeletons while the portfolio query is loading",
    );
  }),
);

test(
  "PublicPortfolio — hides skeletons once the portfolio is loaded",
  withCleanup(() => {
    const { container } = renderPortfolioAt("tok-1", [
      {
        queryKey: ["public", "portfolio", "tok-1"],
        data: {
          title: "테스트 포트폴리오",
          createdAt: "2026-01-01T00:00:00.000Z",
          summary: "요약",
          techStack: [],
          outputLinks: [],
          evidence: { shareToken: "tok-1" },
        },
      },
    ]);
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "PublicPortfolio should have no skeletons once the portfolio is loaded",
    );
    assert.ok(
      screen.queryByText("테스트 포트폴리오"),
      "PublicPortfolio should render the portfolio title once loaded",
    );
  }),
);

// ─── Student portfolio page ───────────────────────────────────────────────────

test(
  "StudentPortfolio — shows skeletons while queries are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(StudentPortfolio), {
      auth: AUTH_STUDENT,
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "StudentPortfolio should show skeletons while data is loading",
    );
  }),
);

test(
  "StudentPortfolio — hides skeletons once queries are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(StudentPortfolio), {
      auth: AUTH_STUDENT,
      queryData: [
        // Empty years → records query stays disabled (isLoading=false).
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
        { queryKey: ["student", "employment-links", "usr-student"], data: { data: [] } },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "StudentPortfolio should have no skeletons once queries are loaded",
    );
  }),
);

// ─── Partner dashboard page ───────────────────────────────────────────────────

test(
  "PartnerDashboard — shows skeletons while participations are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(PartnerDashboard), {
      auth: AUTH_ADMIN,
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "PartnerDashboard should show skeletons while participations are loading",
    );
  }),
);

test(
  "PartnerDashboard — hides skeletons once participations are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(PartnerDashboard), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["partner", "company-participations"],
          data: { data: [], company: { name: "테스트기업" } },
        },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "PartnerDashboard should have no skeletons once participations are loaded",
    );
  }),
);

// ─── Partner project page ─────────────────────────────────────────────────────
// The projects skeleton only shows once a business year is known (the projects
// query is disabled until then), so the loading-state test pre-loads years.

test(
  "PartnerProject — shows skeletons while projects are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(PartnerProject), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [{ id: "year-1", name: "2026" }] },
        },
      ],
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "PartnerProject should show skeletons while projects are loading",
    );
  }),
);

test(
  "PartnerProject — hides skeletons once projects are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(PartnerProject), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [{ id: "year-1", name: "2026" }] },
        },
        {
          queryKey: ["partner", "company-participations", "year-1", "PROJECT"],
          data: { data: [] },
        },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "PartnerProject should have no skeletons once projects are loaded",
    );
  }),
);

// ─── Partner survey page ──────────────────────────────────────────────────────

test(
  "PartnerSurvey — shows skeletons while years/surveys are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(PartnerSurvey), {
      auth: AUTH_ADMIN,
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "PartnerSurvey should show skeletons while years/surveys are loading",
    );
  }),
);

test(
  "PartnerSurvey — hides skeletons once years and surveys are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(PartnerSurvey), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [{ id: "year-1", name: "2026" }] },
        },
        {
          queryKey: ["partner", "company-participations", "year-1", "DEMAND_SURVEY"],
          data: { data: [] },
        },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "PartnerSurvey should have no skeletons once years and surveys are loaded",
    );
  }),
);

// ─── Admin dashboard page ─────────────────────────────────────────────────────

test(
  "AdminDashboard — shows skeleton stat cards while queries are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(AdminDashboard), {
      auth: AUTH_ADMIN,
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "AdminDashboard should show skeleton stat cards while data is loading",
    );
  }),
);

test(
  "AdminDashboard — hides skeletons once queries are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(AdminDashboard), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → programs/assessments/budget queries stay disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
        { queryKey: ["admin", "program-applications"], data: { data: [] } },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "AdminDashboard should have no skeletons once queries are loaded",
    );
  }),
);

// ─── Admin employment page ────────────────────────────────────────────────────

test(
  "AdminEmployment — shows skeletons while participations are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(AdminEmployment), {
      auth: AUTH_ADMIN,
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "AdminEmployment should show skeletons while participations are loading",
    );
  }),
);

test(
  "AdminEmployment — hides skeletons once participations are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(AdminEmployment), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "company-participations"], data: { data: [] } },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "AdminEmployment should have no skeletons once participations are loaded",
    );
  }),
);

// ─── Admin partners page ──────────────────────────────────────────────────────

test(
  "AdminPartners — shows skeletons while company applications are loading",
  withLoadingCleanup(() => {
    const { container } = renderPage(createElement(AdminPartners), {
      auth: AUTH_ADMIN,
    });
    assert.ok(
      container.querySelectorAll(".animate-pulse").length > 0,
      "AdminPartners should show skeletons while company applications are loading",
    );
  }),
);

test(
  "AdminPartners — hides skeletons once applications and companies are loaded",
  withCleanup(() => {
    const { container } = renderPage(createElement(AdminPartners), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "companies"], data: { data: [] } },
        {
          queryKey: ["admin", "company-applications"],
          data: { data: [], commitments: [] },
        },
      ],
    });
    assert.equal(
      container.querySelectorAll(".animate-pulse").length,
      0,
      "AdminPartners should have no skeletons once applications and companies are loaded",
    );
  }),
);

// ─── Admin performance dashboard page ─────────────────────────────────────────

test(
  "AdminPerformanceDashboard — shows LoadingCard while performance data is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPerformanceDashboard), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("성과관리 현황을 불러오는 중입니다."),
      "AdminPerformanceDashboard should show LoadingCard while performance data is loading",
    );
  }),
);

test(
  "AdminPerformanceDashboard — hides LoadingCard once performance data is loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPerformanceDashboard), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → yearId undefined → overview query stays disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("성과관리 현황을 불러오는 중입니다."),
      "AdminPerformanceDashboard should hide LoadingCard once performance data is loaded",
    );
  }),
);

// ─── Admin performance evidence page ──────────────────────────────────────────

test(
  "AdminPerformanceEvidence — shows LoadingCard while stored files are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPerformanceEvidence), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("증빙자료 목록을 불러오는 중입니다."),
      "AdminPerformanceEvidence should show LoadingCard while stored files are loading",
    );
  }),
);

test(
  "AdminPerformanceEvidence — hides LoadingCard once stored files are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPerformanceEvidence), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "stored-files"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("증빙자료 목록을 불러오는 중입니다."),
      "AdminPerformanceEvidence should hide LoadingCard once stored files are loaded",
    );
  }),
);

// ─── Admin performance export page ────────────────────────────────────────────

test(
  "AdminPerformanceExport — shows LoadingCard while export data is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPerformanceExport), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("내보내기 정보를 불러오는 중입니다."),
      "AdminPerformanceExport should show LoadingCard while export data is loading",
    );
  }),
);

test(
  "AdminPerformanceExport — hides LoadingCard once export data is loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPerformanceExport), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → year.id undefined → overview query stays disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("내보내기 정보를 불러오는 중입니다."),
      "AdminPerformanceExport should hide LoadingCard once export data is loaded",
    );
  }),
);

// ─── Admin performance indicators page ────────────────────────────────────────

test(
  "AdminPerformanceIndicators — shows LoadingCard while indicators are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPerformanceIndicators), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("성과지표 목록을 불러오는 중입니다."),
      "AdminPerformanceIndicators should show LoadingCard while indicators are loading",
    );
  }),
);

test(
  "AdminPerformanceIndicators — hides LoadingCard once indicators are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPerformanceIndicators), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → yearId undefined → overview query stays disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("성과지표 목록을 불러오는 중입니다."),
      "AdminPerformanceIndicators should hide LoadingCard once indicators are loaded",
    );
  }),
);

// ─── Admin performance results page ───────────────────────────────────────────

test(
  "AdminPerformanceResults — shows LoadingCard while results are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPerformanceResults), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("성과실적을 불러오는 중입니다."),
      "AdminPerformanceResults should show LoadingCard while results are loading",
    );
  }),
);

test(
  "AdminPerformanceResults — hides LoadingCard once results are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPerformanceResults), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → yearId undefined → overview query stays disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
        // stored-files query is enabled because AUTH_ADMIN has SYSTEM_ADMIN
        // (canEdit=true), so it must be pre-loaded too.
        {
          queryKey: ["admin", "stored-files", "performance-result-link"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("성과실적을 불러오는 중입니다."),
      "AdminPerformanceResults should hide LoadingCard once results are loaded",
    );
  }),
);

// ─── Admin performance source-data page ───────────────────────────────────────

test(
  "AdminPerformanceSourceData — shows LoadingCard while source data is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPerformanceSourceData), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("원천데이터 현황을 불러오는 중입니다."),
      "AdminPerformanceSourceData should show LoadingCard while source data is loading",
    );
  }),
);

test(
  "AdminPerformanceSourceData — hides LoadingCard once source data is loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPerformanceSourceData), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → yearId undefined → source-summary query stays disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("원천데이터 현황을 불러오는 중입니다."),
      "AdminPerformanceSourceData should hide LoadingCard once source data is loaded",
    );
  }),
);

test(
  "AdminAcademics — shows LoadingCard while years/courses are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminAcademics), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("학사·교육과정 정보를 불러오는 중입니다."),
      "AdminAcademics should show LoadingCard while years/courses are loading",
    );
  }),
);

test(
  "AdminAcademics — hides LoadingCard once years and courses are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminAcademics), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → yearId=undefined → terms/offerings/curricula stay disabled.
        { queryKey: ["reference", "business-years"], data: { data: [] } },
        { queryKey: ["admin", "courses"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("학사·교육과정 정보를 불러오는 중입니다."),
      "AdminAcademics should hide LoadingCard once years and courses are loaded",
    );
  }),
);

// ─── Admin applications page ──────────────────────────────────────────────────
// On-mount query: ["admin","program-applications"].

test(
  "AdminApplications — shows LoadingCard while applications are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminApplications), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("신청·선발 목록을 불러오는 중입니다."),
      "AdminApplications should show LoadingCard while applications are loading",
    );
  }),
);

test(
  "AdminApplications — hides LoadingCard once applications are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminApplications), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "program-applications"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("신청·선발 목록을 불러오는 중입니다."),
      "AdminApplications should hide LoadingCard once applications are loaded",
    );
  }),
);

// ─── Admin audit-logs page ────────────────────────────────────────────────────
// Two on-mount queries share the "감사로그를 불러오는 중입니다." message:
//   - logs:           ["audit-logs", filters]  (filters built from date range)
//   - shareTokenLogs: ["audit-logs", "share-token", ""]  (empty recordId)
// The `filters` object is computed at mount from asRange(dateInput(7),
// dateInput(0)); we replicate that computation deterministically here so the
// pre-loaded queryKey matches exactly.

function auditFiltersKey() {
  const dateInput = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().slice(0, 10);
  };
  const asRange = (startDate: string, endDate: string) => ({
    startAt: new Date(`${startDate}T00:00:00`).toISOString(),
    endAt: new Date(`${endDate}T23:59:59.999`).toISOString(),
  });
  return { ...asRange(dateInput(7), dateInput(0)), action: "", resourceType: "" };
}

test(
  "AdminAuditLogs — shows LoadingCard while audit-log queries are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });
    // Both the main-log section and the share-link section render the same
    // LoadingCard message while their queries are in flight, so use
    // queryAllByText to avoid a "multiple elements" error.
    assert.ok(
      screen.queryAllByText("감사로그를 불러오는 중입니다.").length > 0,
      "AdminAuditLogs should show LoadingCard while audit-log queries are loading",
    );
  }),
);

test(
  "AdminAuditLogs — hides LoadingCard once audit-log queries are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminAuditLogs), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["audit-logs", auditFiltersKey()],
          data: { data: [], meta: { page: 1, pageSize: 100, total: 0 } },
        },
        {
          // Infinite query — cache shape is { pages, pageParams }.
          queryKey: ["audit-logs", "share-token", ""],
          data: {
            pages: [{ page: 1, items: [], total: 0, hasMore: false }],
            pageParams: [1],
          },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("감사로그를 불러오는 중입니다."),
      "AdminAuditLogs should hide LoadingCard once audit-log queries are loaded",
    );
  }),
);

// ─── Admin budget-log page ────────────────────────────────────────────────────
// On-mount query: ["admin","budget-change-history"].

test(
  "AdminBudgetLog — shows LoadingCard while change-history is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminBudgetLog), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("예산 변경이력을 불러오는 중입니다."),
      "AdminBudgetLog should show LoadingCard while change-history is loading",
    );
  }),
);

test(
  "AdminBudgetLog — hides LoadingCard once change-history is loaded",
  withCleanup(() => {
    renderPage(createElement(AdminBudgetLog), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "budget-change-history"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("예산 변경이력을 불러오는 중입니다."),
      "AdminBudgetLog should hide LoadingCard once change-history is loaded",
    );
  }),
);

// ─── Admin budget page ────────────────────────────────────────────────────────
// On-mount queries: ["reference","business-years","active"] (years) and
// ["admin","files","budget-picker"] (files). summary/operations are gated
// behind yearId and are ignored for the loading condition.

test(
  "AdminBudget — shows LoadingCard while years/files are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminBudget), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("예산 집행현황을 불러오는 중입니다."),
      "AdminBudget should show LoadingCard while years/files are loading",
    );
  }),
);

test(
  "AdminBudget — hides LoadingCard once years and files are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminBudget), {
      auth: AUTH_ADMIN,
      queryData: [
        // Empty years → yearId=undefined → summary/operations stay disabled.
        { queryKey: ["reference", "business-years", "active"], data: { data: [] } },
        { queryKey: ["admin", "files", "budget-picker"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("예산 집행현황을 불러오는 중입니다."),
      "AdminBudget should hide LoadingCard once years and files are loaded",
    );
  }),
);

// ─── Admin completion page ────────────────────────────────────────────────────
// On-mount query: ["admin","completion-assessments"].

test(
  "AdminCompletion — shows LoadingCard while assessments are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminCompletion), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("이수 평가 결과를 불러오는 중입니다."),
      "AdminCompletion should show LoadingCard while assessments are loading",
    );
  }),
);

test(
  "AdminCompletion — hides LoadingCard once assessments are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminCompletion), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "completion-assessments"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("이수 평가 결과를 불러오는 중입니다."),
      "AdminCompletion should hide LoadingCard once assessments are loaded",
    );
  }),
);

test(
  "AdminEvaluation — shows LoadingCard while business-years query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminEvaluation), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("성과 자체평가 데이터를 불러오는 중입니다."),
      "AdminEvaluation should show LoadingCard while the business-years query is loading",
    );
  }),
);

test(
  "AdminEvaluation — hides LoadingCard once business-years is loaded",
  withCleanup(() => {
    renderPage(createElement(AdminEvaluation), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("성과 자체평가 데이터를 불러오는 중입니다."),
      "AdminEvaluation should hide LoadingCard once business-years is loaded",
    );
  }),
);

// ─── Admin evidence page ──────────────────────────────────────────────────────
// On-mount query: files ["admin", "stored-files"].
// relationships ["admin", "file-relationships", selectedId] is gated (enabled).

test(
  "AdminEvidence — shows LoadingCard while stored-files query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminEvidence), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("증빙자료 목록을 불러오는 중입니다."),
      "AdminEvidence should show LoadingCard while the stored-files query is loading",
    );
  }),
);

test(
  "AdminEvidence — hides LoadingCard once stored-files are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminEvidence), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "stored-files"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("증빙자료 목록을 불러오는 중입니다."),
      "AdminEvidence should hide LoadingCard once stored-files are loaded",
    );
  }),
);

// ─── Admin preview-operations page ────────────────────────────────────────────
// On-mount query: operations ["fake-data", "operations"].

test(
  "AdminPreviewOperations — shows LoadingCard while operations query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPreviewOperations), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("역할별 업무현황을 불러오는 중입니다."),
      "AdminPreviewOperations should show LoadingCard while the operations query is loading",
    );
  }),
);

test(
  "AdminPreviewOperations — hides LoadingCard once operations are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPreviewOperations), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["fake-data", "operations"],
          data: {
            role: "SYSTEM_ADMIN",
            operations: {
              benefitPolicies: [],
              companyApplications: [],
              contentWorkflow: [],
              reviewQueue: [],
            },
            auditLogs: [],
          },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("역할별 업무현황을 불러오는 중입니다."),
      "AdminPreviewOperations should hide LoadingCard once operations are loaded",
    );
  }),
);

// ─── Admin program-operations page ──────────────────────────────────────────
// On-mount query: programs ["admin", "programs", "operations"].
// operations ["admin", "program-operations", sessionId] is gated (enabled).

test(
  "AdminProgramOperations — shows LoadingCard while programs query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminProgramOperations), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("프로그램 운영 정보를 불러오는 중입니다."),
      "AdminProgramOperations should show LoadingCard while the programs query is loading",
    );
  }),
);

test(
  "AdminProgramOperations — hides LoadingCard once programs are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminProgramOperations), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["admin", "programs", "operations"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("프로그램 운영 정보를 불러오는 중입니다."),
      "AdminProgramOperations should hide LoadingCard once programs are loaded",
    );
  }),
);

// ─── Admin programs page ──────────────────────────────────────────────────────
// On-mount query: programs ["admin", "programs"].

test(
  "AdminPrograms — shows LoadingCard while programs query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminPrograms), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("프로그램 목록을 불러오는 중입니다."),
      "AdminPrograms should show LoadingCard while the programs query is loading",
    );
  }),
);

test(
  "AdminPrograms — hides LoadingCard once programs are loaded",
  withCleanup(() => {
    renderPage(createElement(AdminPrograms), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["admin", "programs"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("프로그램 목록을 불러오는 중입니다."),
      "AdminPrograms should hide LoadingCard once programs are loaded",
    );
  }),
);

// ─── Admin settings page ──────────────────────────────────────────────────────
// On-mount query: status ["system", "status"].

test(
  "AdminSettings — shows LoadingCard while system-status query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(AdminSettings), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("시스템 설정 상태를 불러오는 중입니다."),
      "AdminSettings should show LoadingCard while the system-status query is loading",
    );
  }),
);

test(
  "AdminSettings — hides LoadingCard once system status is loaded",
  withCleanup(() => {
    renderPage(createElement(AdminSettings), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["system", "status"],
          data: {
            database: "CONNECTED",
            fileStorageConfigured: false,
            malwareScanningConfigured: false,
            externalImportAllowlistConfigured: false,
            environment: "development",
            ssoConfigured: false,
            mockAuthEnabled: true,
          },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("시스템 설정 상태를 불러오는 중입니다."),
      "AdminSettings should hide LoadingCard once system status is loaded",
    );
  }),
);

// ─── Partner application page ─────────────────────────────────────────────────

test(
  "PartnerApplication — shows LoadingCard while company applications are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(PartnerApplication), { auth: AUTH_PARTNER });
    assert.ok(
      screen.queryByText("참여기업 신청 내역을 불러오는 중입니다."),
      "PartnerApplication should show LoadingCard while company applications are loading",
    );
  }),
);

test(
  "PartnerApplication — hides LoadingCard once company applications are loaded",
  withCleanup(() => {
    renderPage(createElement(PartnerApplication), {
      auth: AUTH_PARTNER,
      queryData: [
        {
          queryKey: ["partner", "company-applications"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("참여기업 신청 내역을 불러오는 중입니다."),
      "PartnerApplication should hide LoadingCard once company applications are loaded",
    );
  }),
);

// ─── Partner evaluation page ──────────────────────────────────────────────────

test(
  "PartnerEvaluation — shows LoadingCard while years/portfolios are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(PartnerEvaluation), { auth: AUTH_PARTNER });
    assert.ok(
      screen.queryByText("학생 프로젝트 목록을 불러오는 중입니다."),
      "PartnerEvaluation should show LoadingCard while years/portfolios are loading",
    );
  }),
);

test(
  "PartnerEvaluation — hides LoadingCard once years and portfolios are loaded",
  withCleanup(() => {
    renderPage(createElement(PartnerEvaluation), {
      auth: AUTH_PARTNER,
      queryData: [
        {
          queryKey: ["reference", "business-years", "active"],
          data: { data: [] },
        },
        {
          queryKey: ["partner", "portfolio-candidates"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("학생 프로젝트 목록을 불러오는 중입니다."),
      "PartnerEvaluation should hide LoadingCard once years and portfolios are loaded",
    );
  }),
);

// ─── Public home page ─────────────────────────────────────────────────────────

test(
  "Home — shows LoadingCard while programs/companies/results are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(Home), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("공개 포털 현황을 불러오는 중입니다."),
      "Home should show LoadingCard while public portal data is loading",
    );
  }),
);

test(
  "Home — hides LoadingCard once all public portal queries are loaded",
  withCleanup(() => {
    renderPage(createElement(Home), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["public", "home", "programs"], data: { data: [] } },
        { queryKey: ["public", "home", "companies"], data: { data: [] } },
        { queryKey: ["public", "home", "results"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("공개 포털 현황을 불러오는 중입니다."),
      "Home should hide LoadingCard once all public portal queries are loaded",
    );
  }),
);

// ─── Public partners page ─────────────────────────────────────────────────────

test(
  "Partners — shows LoadingCard while companies query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(Partners), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("참여기업 정보를 불러오는 중입니다."),
      "Partners should show LoadingCard while the companies query is loading",
    );
  }),
);

test(
  "Partners — hides LoadingCard once companies are loaded",
  withCleanup(() => {
    renderPage(createElement(Partners), {
      auth: AUTH_ADMIN,
      queryData: [{ queryKey: ["public", "companies"], data: { data: [] } }],
    });
    assert.ok(
      !screen.queryByText("참여기업 정보를 불러오는 중입니다."),
      "Partners should hide LoadingCard once companies are loaded",
    );
  }),
);

// ─── Public performance page ──────────────────────────────────────────────────

test(
  "Performance — shows LoadingCard while results/news are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(Performance), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("성과와 소식을 불러오는 중입니다."),
      "Performance should show LoadingCard while results/news are loading",
    );
  }),
);

test(
  "Performance — hides LoadingCard once results and news are loaded",
  withCleanup(() => {
    renderPage(createElement(Performance), {
      auth: AUTH_ADMIN,
      queryData: [
        {
          queryKey: ["public", "performance-results"],
          data: { data: [] },
        },
        {
          queryKey: ["public", "content", "NEWS"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("성과와 소식을 불러오는 중입니다."),
      "Performance should hide LoadingCard once results and news are loaded",
    );
  }),
);

// ─── Public recruitment page ──────────────────────────────────────────────────

test(
  "Recruitment — shows LoadingCard while the programs query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(Recruitment), { auth: AUTH_ADMIN });
    assert.ok(
      screen.queryByText("모집 프로그램을 불러오는 중입니다."),
      "Recruitment should show LoadingCard while the programs query is loading",
    );
  }),
);

test(
  "Recruitment — hides LoadingCard once programs are loaded",
  withCleanup(() => {
    renderPage(createElement(Recruitment), {
      auth: AUTH_ADMIN,
      queryData: [
        { queryKey: ["public", "programs", "open"], data: { data: [] } },
      ],
    });
    assert.ok(
      !screen.queryByText("모집 프로그램을 불러오는 중입니다."),
      "Recruitment should hide LoadingCard once programs are loaded",
    );
  }),
);

// ─── Student apply page ───────────────────────────────────────────────────────

test(
  "StudentApply — shows LoadingCard while open programs query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(StudentApply), { auth: AUTH_STUDENT });
    assert.ok(
      screen.queryByText("신청 가능한 프로그램을 불러오는 중입니다."),
      "StudentApply should show LoadingCard while the open programs query is loading",
    );
  }),
);

test(
  "StudentApply — hides LoadingCard once open programs are loaded",
  withCleanup(() => {
    renderPage(createElement(StudentApply), {
      auth: AUTH_STUDENT,
      queryData: [{ queryKey: ["programs", "open"], data: { data: [] } }],
    });
    assert.ok(
      !screen.queryByText("신청 가능한 프로그램을 불러오는 중입니다."),
      "StudentApply should hide LoadingCard once open programs are loaded",
    );
  }),
);

// ─── Student completion page ──────────────────────────────────────────────────

test(
  "StudentCompletion — shows LoadingCard while completion assessments are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(StudentCompletion), { auth: AUTH_STUDENT });
    assert.ok(
      screen.queryByText("이수현황을 불러오는 중입니다."),
      "StudentCompletion should show LoadingCard while the completion assessments query is loading",
    );
  }),
);

test(
  "StudentCompletion — hides LoadingCard once completion assessments are loaded",
  withCleanup(() => {
    renderPage(createElement(StudentCompletion), {
      auth: AUTH_STUDENT,
      queryData: [
        {
          queryKey: ["completion-assessments", "usr-student"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("이수현황을 불러오는 중입니다."),
      "StudentCompletion should hide LoadingCard once completion assessments are loaded",
    );
  }),
);

// ─── Student dashboard page ───────────────────────────────────────────────────

test(
  "StudentDashboard — shows LoadingCard while dashboard queries are loading",
  withLoadingCleanup(() => {
    renderPage(createElement(StudentDashboard), { auth: AUTH_STUDENT });
    assert.ok(
      screen.queryByText("대시보드 현황을 불러오는 중입니다."),
      "StudentDashboard should show LoadingCard while its queries are loading",
    );
  }),
);

test(
  "StudentDashboard — hides LoadingCard once dashboard queries are loaded",
  withCleanup(() => {
    renderPage(createElement(StudentDashboard), {
      auth: AUTH_STUDENT,
      queryData: [
        {
          queryKey: ["student-dashboard-applications", "usr-student"],
          data: { data: [] },
        },
        {
          queryKey: ["student-dashboard-completion", "usr-student"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("대시보드 현황을 불러오는 중입니다."),
      "StudentDashboard should hide LoadingCard once its queries are loaded",
    );
  }),
);

// ─── Student learning page ────────────────────────────────────────────────────
// The program-learning query is gated behind a selected sessionId, so only the
// on-mount applications query drives the loading state.

test(
  "StudentLearning — shows LoadingCard while applications query is loading",
  withLoadingCleanup(() => {
    renderPage(createElement(StudentLearning), { auth: AUTH_STUDENT });
    assert.ok(
      screen.queryByText("학습 정보를 불러오는 중입니다."),
      "StudentLearning should show LoadingCard while the applications query is loading",
    );
  }),
);

test(
  "StudentLearning — hides LoadingCard once applications are loaded",
  withCleanup(() => {
    renderPage(createElement(StudentLearning), {
      auth: AUTH_STUDENT,
      queryData: [
        {
          queryKey: ["student", "learning-applications", "usr-student"],
          data: { data: [] },
        },
      ],
    });
    assert.ok(
      !screen.queryByText("학습 정보를 불러오는 중입니다."),
      "StudentLearning should hide LoadingCard once applications are loaded",
    );
  }),
);
