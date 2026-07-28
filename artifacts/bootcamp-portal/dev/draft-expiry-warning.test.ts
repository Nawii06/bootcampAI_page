/**
 * Draft-expiry warning tests for forms that recover localStorage drafts.
 *
 * useFormDraft (src/hooks/useFormDraft.ts) restores `form-draft:*` entries on
 * mount and reports `isNearExpiry` when the draft is within 24h of its 7-day
 * TTL. Every page passing an `onRestored` callback shows a toast:
 *   • fresh draft      → plain toast (no description, no yellow classes)
 *   • near-expiry draft → yellow toast (border-yellow-500 …) whose description
 *     includes the draft age in days and a re-save/submit nudge.
 *
 * These tests seed localStorage with a draft whose `savedAt` places it either
 * inside or outside the near-expiry window, render the real page component,
 * and assert on the toast dispatched through the shared use-toast store.
 *
 * Pages covered (one per portal area, per task requirements):
 *   • student/apply.tsx            (key: form-draft:/student/apply)
 *   • partner/employment.tsx       (key: form-draft:/partner/employment)
 *   • admin/academics.tsx (course) (key: form-draft:admin/academics/course)
 *
 * Isolation strategy mirrors page-loading-states.test.ts:
 *   – AuthContext.Provider with a resolved mock session
 *   – QueryClient caches pre-populated so no real fetch is required
 *   – toast state observed via a probe component using useToast(); the store
 *     is module-global, so each test verifies a NEW toast id appeared.
 *
 * DOM environment: happy-dom (setup-dom.ts). localStorage is not wired up by
 * setup-dom, so we bridge happy-dom's window.localStorage onto globalThis.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { render, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthContext,
  type AuthContextType,
} from "../src/contexts/AuthContext.tsx";
import { useToast } from "../src/hooks/use-toast.ts";
import StudentApply from "../src/pages/student/apply.tsx";
import PartnerEmployment from "../src/pages/partner/employment.tsx";
import AdminAcademics from "../src/pages/admin/academics.tsx";

// ─── Globals needed outside a Vite bundle ────────────────────────────────────
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// Bridge happy-dom localStorage to the bare global used by useFormDraft.
const g = globalThis as Record<string, unknown>;
if (!g.localStorage) {
  g.localStorage = (g.window as Window).localStorage;
}

// ─── Constants (must match useFormDraft.ts) ──────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_MS = 7 * DAY_MS;

const RESTORED_TITLE = "이전에 작성 중이던 내용을 불러왔습니다";
const YELLOW_CLASS = "border-yellow-500";

// ─── Mock auth ────────────────────────────────────────────────────────────────
function makeAuth(role: string, roles: string[]): AuthContextType {
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "테스트 사용자",
      role,
      roles,
      loginId: "user@example.com",
      defaultRoute: "/",
    } as AuthContextType["user"],
    isLoading: false,
    refreshSession: async () => null,
    loginWithFakeIdentity: async () => {
      throw new Error("not available in tests");
    },
    logout: async () => {},
    hasPermission: () => true,
  };
}

const STUDENT_AUTH = makeAuth("student", ["STUDENT"]);
const PARTNER_AUTH = makeAuth("partner", ["COMPANY_MANAGER"]);
const ADMIN_AUTH = makeAuth("admin", ["ADMIN"]);

// ─── Toast probe ──────────────────────────────────────────────────────────────
// use-toast keeps a module-global store; the probe mirrors it into `captured`
// so tests can assert on the toast object (title/description/className).
interface CapturedToast {
  id: string;
  title?: unknown;
  description?: unknown;
  className?: string;
}
let captured: CapturedToast[] = [];
let lastSeenToastId: string | null = null;

function ToastProbe() {
  const { toasts } = useToast();
  captured = toasts as unknown as CapturedToast[];
  return null;
}

// ─── Query helpers ────────────────────────────────────────────────────────────
function makeQueryClient() {
  const qc = new QueryClient({
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
  return qc;
}

const EMPTY_LIST = { data: [], meta: { page: 1, pageSize: 100, total: 0 } };

/** Pre-populate every query each page issues so no fetch is initiated. */
function seedQueries(qc: QueryClient) {
  // student/apply
  qc.setQueryData(["programs", "open"], EMPTY_LIST);
  // partner/employment — empty active years ⇒ dependent queries stay disabled
  qc.setQueryData(["reference", "business-years", "active"], EMPTY_LIST);
  // admin/academics — empty years ⇒ terms/offerings/curricula stay disabled
  qc.setQueryData(["reference", "business-years"], EMPTY_LIST);
  qc.setQueryData(["admin", "courses"], EMPTY_LIST);
}

function renderPage(page: ReactElement, auth: AuthContextType) {
  const qc = makeQueryClient();
  seedQueries(qc);
  const result = render(
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client: qc }, page),
    ),
  );
  // Mount the probe AFTER the page so its initial useState(memoryState) call
  // sees any toast dispatched during the page's mount effects. (A probe
  // mounted alongside the page subscribes too late to catch that dispatch.)
  render(createElement(ToastProbe));
  return result;
}

// ─── Draft seeding ────────────────────────────────────────────────────────────
function seedDraft(key: string, data: object, ageMs: number) {
  localStorage.setItem(
    `form-draft:${key}`,
    JSON.stringify({ data, savedAt: Date.now() - ageMs }),
  );
}

/** Age placing the draft inside the 24h near-expiry window (~6 days 2 hours). */
const NEAR_EXPIRY_AGE_MS = TTL_MS - 22 * 60 * 60 * 1000;
const NEAR_EXPIRY_AGE_DAYS = Math.floor(NEAR_EXPIRY_AGE_MS / DAY_MS); // 6
/** Fresh draft, well outside the near-expiry window. */
const FRESH_AGE_MS = 60 * 60 * 1000; // 1 hour

// ─── Assertions ───────────────────────────────────────────────────────────────
function getNewToast(): CapturedToast {
  assert.ok(captured.length > 0, "a toast should have been dispatched");
  const top = captured[0];
  assert.notEqual(
    top.id,
    lastSeenToastId,
    "a NEW toast should appear (not a leftover from a previous test)",
  );
  lastSeenToastId = top.id;
  return top;
}

function assertNearExpiryToast(t: CapturedToast) {
  assert.equal(t.title, RESTORED_TITLE);
  assert.ok(
    typeof t.className === "string" && t.className.includes(YELLOW_CLASS),
    `toast should carry yellow styling (${YELLOW_CLASS}); got: ${t.className}`,
  );
  const desc = String(t.description ?? "");
  assert.ok(
    desc.includes(`${NEAR_EXPIRY_AGE_DAYS}일 전에 저장된`),
    `description should state the draft age in days; got: ${desc}`,
  );
  assert.ok(
    desc.includes("24시간 내에 만료") && desc.includes("다시 저장"),
    `description should nudge the user to submit or re-save; got: ${desc}`,
  );
}

function assertFreshToast(t: CapturedToast) {
  assert.equal(t.title, RESTORED_TITLE);
  assert.equal(
    t.description,
    undefined,
    "fresh drafts should NOT show the expiry description",
  );
  assert.ok(
    !(t.className ?? "").includes("yellow"),
    "fresh drafts should NOT be styled yellow",
  );
}

function withCleanup(fn: () => void) {
  return () => {
    try {
      fn();
    } finally {
      cleanup();
      localStorage.clear();
    }
  };
}

// ─── student/apply ────────────────────────────────────────────────────────────
const APPLY_DRAFT = { sessionId: "", reason: "임시 저장된 신청 사유" };

test(
  "student/apply — near-expiry draft shows the yellow warning toast",
  withCleanup(() => {
    seedDraft("/student/apply", APPLY_DRAFT, NEAR_EXPIRY_AGE_MS);
    renderPage(createElement(StudentApply), STUDENT_AUTH);
    assertNearExpiryToast(getNewToast());
  }),
);

test(
  "student/apply — fresh draft shows the normal (non-yellow) toast",
  withCleanup(() => {
    seedDraft("/student/apply", APPLY_DRAFT, FRESH_AGE_MS);
    renderPage(createElement(StudentApply), STUDENT_AUTH);
    assertFreshToast(getNewToast());
  }),
);

// ─── partner/employment ───────────────────────────────────────────────────────
const EMPLOYMENT_DRAFT = {
  participationType: "INTERNSHIP",
  title: "임시 저장된 고용 건",
  skills: "Python, ML",
  participantCount: 3,
  employmentCount: 1,
  startsAt: "",
  endsAt: "",
};

test(
  "partner/employment — near-expiry draft shows the yellow warning toast",
  withCleanup(() => {
    seedDraft("/partner/employment", EMPLOYMENT_DRAFT, NEAR_EXPIRY_AGE_MS);
    renderPage(createElement(PartnerEmployment), PARTNER_AUTH);
    assertNearExpiryToast(getNewToast());
  }),
);

test(
  "partner/employment — fresh draft shows the normal (non-yellow) toast",
  withCleanup(() => {
    seedDraft("/partner/employment", EMPLOYMENT_DRAFT, FRESH_AGE_MS);
    renderPage(createElement(PartnerEmployment), PARTNER_AUTH);
    assertFreshToast(getNewToast());
  }),
);

// ─── admin/academics (course section) ─────────────────────────────────────────
const COURSE_DRAFT = {
  courseCode: "AI-999",
  courseName: "임시 저장된 교과목",
  courseEnglishName: "",
  courseDescription: "",
  departmentCode: "AI_BOOTCAMP",
  sourceSystem: "",
  externalId: "",
  credits: "3",
  editingCourseId: "",
};

test(
  "admin/academics (course) — near-expiry draft shows the yellow warning toast",
  withCleanup(() => {
    seedDraft("admin/academics/course", COURSE_DRAFT, NEAR_EXPIRY_AGE_MS);
    renderPage(createElement(AdminAcademics), ADMIN_AUTH);
    assertNearExpiryToast(getNewToast());
  }),
);

test(
  "admin/academics (course) — fresh draft shows the normal (non-yellow) toast",
  withCleanup(() => {
    seedDraft("admin/academics/course", COURSE_DRAFT, FRESH_AGE_MS);
    renderPage(createElement(AdminAcademics), ADMIN_AUTH);
    assertFreshToast(getNewToast());
  }),
);
