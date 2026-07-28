/**
 * Draft-reset ('초기화') toast-action tests.
 *
 * Every draft-recovery form shows a restore toast whose '초기화' action must
 * BOTH remove the `form-draft:*` localStorage entry AND reset the form fields
 * to their defaults. These tests exercise that action end-to-end on one
 * representative page per portal area:
 *   • student/apply.tsx            (key: form-draft:/student/apply)
 *   • partner/project.tsx          (key: form-draft:/partner/project)
 *   • admin/academics.tsx (course) (key: form-draft:admin/academics/course)
 *
 * Test shape (mirrors draft-expiry-warning.test.ts, whose helper pattern is
 * reused here — probe on the module-global toast store, seeded query caches,
 * AuthContext injection):
 *   1. seed a fresh draft, render the real page — the restore toast fires and
 *      the restored (non-default) values appear in the form fields;
 *   2. wait past the 400ms save debounce — useFormDraft re-persists the
 *      restored state, so the form-draft entry EXISTS again (this is exactly
 *      the state a regression would leave behind);
 *   3. invoke the toast's '초기화' ToastAction onClick;
 *   4. wait past the debounce again and assert the localStorage entry is gone
 *      and the form fields show their defaults.
 *
 * The ToastAction element lives in the toast store (no <Toaster> is mounted
 * in these tests), so the click is exercised by invoking the action element's
 * onClick inside act() — the exact handler a real click would run.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AuthContext,
  type AuthContextType,
} from "../src/contexts/AuthContext.tsx";
import { useToast } from "../src/hooks/use-toast.ts";
import StudentApply from "../src/pages/student/apply.tsx";
import AdminAcademics from "../src/pages/admin/academics.tsx";
import PartnerProject from "../src/pages/partner/project.tsx";

// ─── Globals needed outside a Vite bundle ────────────────────────────────────
(globalThis as Record<string, unknown>).__FAKE_DATA_SET__ = null;

// Bridge happy-dom localStorage to the bare global used by useFormDraft.
const g = globalThis as Record<string, unknown>;
if (!g.localStorage) {
  g.localStorage = (g.window as Window).localStorage;
}

// Radix primitives (react-use-size) require ResizeObserver; happy-dom lacks it.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

const RESTORED_TITLE = "이전에 작성 중이던 내용을 불러왔습니다";
/** useFormDraft's save debounce is 400ms; wait comfortably past it. */
const DEBOUNCE_WAIT_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

// ─── Toast probe (module-global use-toast store) ──────────────────────────────
interface CapturedToast {
  id: string;
  title?: unknown;
  action?: ReactElement<{ onClick: () => void }>;
}
let captured: CapturedToast[] = [];
let lastSeenToastId: string | null = null;

function ToastProbe() {
  const { toasts } = useToast();
  captured = toasts as unknown as CapturedToast[];
  return null;
}

// ─── Query helpers ────────────────────────────────────────────────────────────
const EMPTY_LIST = { data: [], meta: { page: 1, pageSize: 100, total: 0 } };

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
  // Pre-populate every query each page issues so no fetch is initiated.
  qc.setQueryData(["programs", "open"], EMPTY_LIST); // student/apply
  qc.setQueryData(["reference", "business-years", "active"], EMPTY_LIST); // partner/project
  qc.setQueryData(["reference", "business-years"], EMPTY_LIST); // admin/academics
  qc.setQueryData(["admin", "courses"], EMPTY_LIST);
  return qc;
}

function renderPage(page: ReactElement, auth: AuthContextType) {
  const qc = makeQueryClient();
  const result = render(
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client: qc }, page),
    ),
  );
  // Mount the probe AFTER the page so it captures the mount-time toast.
  render(createElement(ToastProbe));
  return result;
}

// ─── Draft seeding / toast helpers ────────────────────────────────────────────
function seedDraft(key: string, data: object) {
  localStorage.setItem(
    `form-draft:${key}`,
    JSON.stringify({ data, savedAt: Date.now() - 60 * 60 * 1000 }), // 1h old
  );
}

function getRestoreToast(): CapturedToast {
  assert.ok(captured.length > 0, "the restore toast should have been dispatched");
  const top = captured[0];
  assert.notEqual(top.id, lastSeenToastId, "a NEW toast should appear");
  lastSeenToastId = top.id;
  assert.equal(top.title, RESTORED_TITLE);
  return top;
}

function clickReset(t: CapturedToast) {
  assert.ok(t.action, "restore toast should carry the 초기화 action");
  const props = t.action.props;
  assert.equal(
    (props as { children?: unknown }).children,
    "초기화",
    "toast action should be labelled 초기화",
  );
  act(() => {
    props.onClick();
  });
}

function withCleanup(fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
      localStorage.clear();
    }
  };
}

// ─── student/apply ────────────────────────────────────────────────────────────
test(
  "student/apply — 초기화 wipes the saved draft and resets the form",
  withCleanup(async () => {
    const storageKey = "form-draft:/student/apply";
    seedDraft("/student/apply", { sessionId: "", reason: "임시 저장된 신청 사유" });

    const { container } = renderPage(createElement(StudentApply), STUDENT_AUTH);
    const toastEntry = getRestoreToast();

    const reasonField = container.querySelector("textarea");
    assert.ok(reasonField, "reason textarea should render");
    assert.equal(reasonField.value, "임시 저장된 신청 사유");

    // The restored (non-default) state is re-persisted after the debounce —
    // this is the stale entry 초기화 must wipe.
    await sleep(DEBOUNCE_WAIT_MS);
    assert.ok(
      localStorage.getItem(storageKey),
      "draft should be re-saved after restore (pre-condition)",
    );

    clickReset(toastEntry);

    await sleep(DEBOUNCE_WAIT_MS);
    assert.equal(
      localStorage.getItem(storageKey),
      null,
      "초기화 must remove the form-draft entry (and it must not be re-saved)",
    );
    assert.equal(reasonField.value, "", "reason should return to its default");
  }),
);

// ─── partner/project ──────────────────────────────────────────────────────────
test(
  "partner/project — 초기화 wipes the saved draft and resets the form",
  withCleanup(async () => {
    const storageKey = "form-draft:/partner/project";
    seedDraft("/partner/project", {
      title: "임시 저장된 프로젝트 제안",
      track: "railway",
      problem: "임시 저장된 문제 정의",
      dataTypes: "영상, 센서 로그",
      outputs: "모델, 보고서",
      mentorRole: "주간 멘토링",
    });

    const { container } = renderPage(createElement(PartnerProject), PARTNER_AUTH);
    const toastEntry = getRestoreToast();

    const titleInput = container.querySelector("input");
    const trackSelect = container.querySelector("select");
    const problemField = container.querySelector("textarea");
    assert.ok(titleInput && trackSelect && problemField, "form fields should render");
    assert.equal(titleInput.value, "임시 저장된 프로젝트 제안");
    assert.equal(trackSelect.value, "railway");
    assert.equal(problemField.value, "임시 저장된 문제 정의");

    await sleep(DEBOUNCE_WAIT_MS);
    assert.ok(
      localStorage.getItem(storageKey),
      "draft should be re-saved after restore (pre-condition)",
    );

    clickReset(toastEntry);

    await sleep(DEBOUNCE_WAIT_MS);
    assert.equal(
      localStorage.getItem(storageKey),
      null,
      "초기화 must remove the form-draft entry (and it must not be re-saved)",
    );
    assert.equal(titleInput.value, "", "title should return to its default");
    assert.equal(trackSelect.value, "autonomous", "track should return to its default");
    assert.equal(problemField.value, "", "problem should return to its default");
  }),
);

// ─── admin/academics (course section) ─────────────────────────────────────────
test(
  "admin/academics (course) — 초기화 wipes the saved draft and resets the form",
  withCleanup(async () => {
    const storageKey = "form-draft:admin/academics/course";
    seedDraft("admin/academics/course", {
      courseCode: "AI-999",
      courseName: "임시 저장된 교과목",
      courseEnglishName: "",
      courseDescription: "",
      departmentCode: "AI_BOOTCAMP",
      sourceSystem: "",
      externalId: "",
      credits: "5",
      editingCourseId: "",
    });

    const { container } = renderPage(createElement(AdminAcademics), ADMIN_AUTH);
    const toastEntry = getRestoreToast();

    const codeInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="교과목 코드"]',
    );
    const nameInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="교과목명"]',
    );
    const creditsInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="기본학점"]',
    );
    assert.ok(codeInput && nameInput && creditsInput, "course inputs should render");
    assert.equal(codeInput.value, "AI-999");
    assert.equal(nameInput.value, "임시 저장된 교과목");
    assert.equal(creditsInput.value, "5");

    await sleep(DEBOUNCE_WAIT_MS);
    assert.ok(
      localStorage.getItem(storageKey),
      "draft should be re-saved after restore (pre-condition)",
    );

    clickReset(toastEntry);

    await sleep(DEBOUNCE_WAIT_MS);
    assert.equal(
      localStorage.getItem(storageKey),
      null,
      "초기화 must remove the form-draft entry (and it must not be re-saved)",
    );
    assert.equal(codeInput.value, "", "course code should return to its default");
    assert.equal(nameInput.value, "", "course name should return to its default");
    assert.equal(creditsInput.value, "3", "credits should return to its default");
  }),
);
