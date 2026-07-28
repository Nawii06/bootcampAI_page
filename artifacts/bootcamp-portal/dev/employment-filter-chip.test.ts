/**
 * /admin/employment — company pre-filter chip label test.
 *
 * Guards the regression where the chip fell back to "기업 필터 적용 중"
 * when the filtered company had zero participation records. The label is
 * now resolved from the companies list query, so the real company name
 * must appear even with an empty participation list.
 *
 * Pattern follows dev/loading-spinner-states.test.ts / dev/TESTING.md:
 *   - AuthContext.Provider injection (no mock.module()).
 *   - setQueryData pre-populates BOTH queries the page uses, so no fetch
 *     is initiated (dataUpdatedAt non-zero + refetchOnMount:false).
 *   - The ?companyId= URL param is provided via history.replaceState so
 *     wouter's useSearch() picks it up at initial render.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../src/contexts/AuthContext.tsx";
import AdminEmployment from "../src/pages/admin/employment.tsx";

// Vite's `define` normally injects this constant at build time.
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// ─── Mock auth ────────────────────────────────────────────────────────────────

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = "00000000-0000-0000-0000-0000000000aa";
const COMPANY_NAME = "무실적 주식회사";

/** Companies list contains the company; participation list has ZERO records
 *  for it (in fact zero records at all). */
const MOCK_COMPANIES = {
  data: [
    {
      id: COMPANY_ID,
      name: COMPANY_NAME,
      companyType: "SME",
      isPublic: true,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const MOCK_PARTICIPATIONS_EMPTY = { data: [] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage(queryData: Array<{ queryKey: unknown[]; data: unknown }>) {
  const client = new QueryClient({
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
  for (const { queryKey, data } of queryData) {
    client.setQueryData(queryKey, data);
  }
  const result = render(
    createElement(
      AuthContext.Provider,
      { value: AUTH_ADMIN },
      createElement(
        QueryClientProvider,
        { client },
        createElement(AdminEmployment),
      ),
    ),
  );
  return { result, client };
}

function withUrl(search: string, fn: () => void) {
  return () => {
    window.history.replaceState(null, "", `/admin/employment${search}`);
    try {
      fn();
    } finally {
      cleanup();
      window.history.replaceState(null, "", "/");
    }
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test(
  "employment filter chip shows the company name even with zero participation records",
  withUrl(`?companyId=${COMPANY_ID}`, () => {
    renderPage([
      { queryKey: ["admin", "company-participations"], data: MOCK_PARTICIPATIONS_EMPTY },
      { queryKey: ["admin", "companies"], data: MOCK_COMPANIES },
    ]);

    // Chip must show the real company name resolved from the companies list…
    assert.ok(
      screen.getByText(COMPANY_NAME),
      "chip must show the company name from the companies list",
    );
    // …not the generic fallback.
    assert.equal(
      screen.queryByText("기업 필터 적용 중"),
      null,
      "generic fallback label must not appear when the name is resolvable",
    );
    // Sanity: zero-record empty state is showing (company truly has no records).
    assert.ok(
      screen.getByText("조건에 맞는 채용연계 건이 없습니다."),
      "empty state must be visible for a company with zero records",
    );
  }),
);

test(
  "employment filter chip falls back to participation data when companies list lacks the company",
  withUrl(`?companyId=${COMPANY_ID}`, () => {
    renderPage([
      {
        queryKey: ["admin", "company-participations"],
        data: {
          data: [
            {
              id: "00000000-0000-0000-0000-0000000000b1",
              companyId: COMPANY_ID,
              companyName: COMPANY_NAME,
              companyType: "SME",
              participationType: "EMPLOYMENT",
              title: "채용 1건",
              participantCount: 1,
              employmentCount: 1,
              startsAt: null,
              endsAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      },
      { queryKey: ["admin", "companies"], data: { data: [] } },
    ]);

    assert.ok(
      screen.getAllByText(COMPANY_NAME).length >= 1,
      "chip must fall back to the participation record's company name",
    );
    assert.equal(
      screen.queryByText("기업 필터 적용 중"),
      null,
      "generic fallback label must not appear when a name is resolvable",
    );
  }),
);
