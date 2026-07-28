/**
 * Quick-action dialog tests — /admin/partners.
 *
 * The 담당자 추가 / 전문가 추가 quick actions used to collect input via bare
 * window.prompt(), and 담당자 보관 used window.confirm(). They now open proper
 * in-app dialogs. Verifies:
 *   1. 담당자 추가 opens a dialog; empty fields and malformed email are
 *      rejected with inline messages (no POST is sent).
 *   2. A valid contact submit POSTs name/email with isPrimary=true when the
 *      company has no contacts yet (primary-contact logic preserved).
 *   3. 전문가 추가 dialog validates required fields and POSTs name/specialty.
 *   4. 담당자 보관 opens a styled confirmation dialog; 취소 sends nothing,
 *      confirming sends the DELETE request.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";

import { renderPage, withCleanup, AUTH_ADMIN } from "./page-test-utils.ts";

import AdminPartners from "../src/pages/admin/partners.tsx";

// Radix's focus scope walks the DOM with createTreeWalker + NodeFilter;
// happy-dom doesn't expose NodeFilter as a global.
for (const name of ["HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "HTMLButtonElement"]) {
  if (!(name in globalThis)) {
    const win = (globalThis as Record<string, unknown>).window as Record<string, unknown> | undefined;
    if (win?.[name]) (globalThis as Record<string, unknown>)[name] = win[name];
  }
}
if (!("NodeFilter" in globalThis)) {
  (globalThis as Record<string, unknown>).NodeFilter = {
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
    SHOW_ALL: 0xffffffff,
    SHOW_ELEMENT: 0x1,
    SHOW_TEXT: 0x4,
  };
}

const JSON_HEADERS = { "content-type": "application/json" };

const company = (
  id: string,
  name: string,
  contacts: Array<{ id: string; name: string; email?: string; isPrimary?: boolean }> = [],
  experts: Array<{ id: string; name: string; specialty?: string; isActive?: boolean }> = [],
) => ({
  id,
  name,
  companyType: "IT서비스",
  registrationNumber: `000-00-0000${id}`,
  description: null,
  website: null,
  isActive: true,
  isPublic: false,
  companyContacts: contacts,
  companyExperts: experts,
  companyParticipations: [],
});

const COMPANIES = {
  data: [
    company("c1", "알파주식회사"),
    company("c2", "베타주식회사", [{ id: "ct1", name: "김담당", isPrimary: true }]),
    company(
      "c3",
      "감마주식회사",
      [
        { id: "ct2", name: "이대표", isPrimary: true },
        { id: "ct3", name: "최부담당", email: "choi@example.com" },
      ],
      [
        { id: "ex1", name: "정전문", specialty: "AI", isActive: true },
        { id: "ex2", name: "한전문", specialty: "보안", isActive: false },
      ],
    ),
  ],
};
const APPLICATIONS = { data: [], commitments: [] };

const _originalFetch = globalThis.fetch;
let mutationCalls: Array<{ url: string; method: string; body: unknown }> = [];

function installRecordingFetch(): void {
  mutationCalls = [];
  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "GET") {
      if (url.includes("/api/v1/company-applications")) {
        return Promise.resolve(
          new Response(JSON.stringify(APPLICATIONS), { status: 200, headers: JSON_HEADERS }),
        );
      }
      if (url.includes("/api/v1/companies")) {
        return Promise.resolve(
          new Response(JSON.stringify(COMPANIES), { status: 200, headers: JSON_HEADERS }),
        );
      }
    }
    mutationCalls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS }),
    );
  };
}

function withDialogFetch(fn: () => void | Promise<void>) {
  return withCleanup(async () => {
    sessionStorage.clear();
    installRecordingFetch();
    try {
      await fn();
    } finally {
      globalThis.fetch = _originalFetch;
    }
  });
}

function renderPartners() {
  return renderPage(createElement(AdminPartners), {
    auth: AUTH_ADMIN,
    queryData: [
      { queryKey: ["admin", "companies"], data: COMPANIES },
      { queryKey: ["admin", "company-applications"], data: APPLICATIONS },
    ],
  });
}

test(
  "담당자 추가 dialog — validates required fields and email format without sending a request",
  withDialogFetch(async () => {
    renderPartners();

    fireEvent.click(screen.getAllByText("담당자 추가")[0]!);
    assert.ok(await screen.findByLabelText("이름"), "dialog form should open");

    // Empty submit → both required errors, no POST.
    fireEvent.click(screen.getByText("추가"));
    assert.ok(await screen.findByText("담당자 이름을 입력해 주세요."));
    assert.ok(screen.getByText("이메일을 입력해 주세요."));
    assert.equal(mutationCalls.length, 0, "invalid submit must not send a request");

    // Malformed email → email format error, still no POST.
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "박담당" } });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByText("추가"));
    assert.ok(await screen.findByText("올바른 이메일 형식이 아닙니다."));
    assert.equal(mutationCalls.length, 0, "malformed email must not send a request");
  }),
);

test(
  "담당자 추가 dialog — valid submit POSTs contact with isPrimary=true for first contact",
  withDialogFetch(async () => {
    renderPartners();

    // First company (알파) has no contacts → new contact should be primary.
    fireEvent.click(screen.getAllByText("담당자 추가")[0]!);
    fireEvent.change(await screen.findByLabelText("이름"), { target: { value: "박담당" } });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "park@example.com" } });
    fireEvent.click(screen.getByText("추가"));

    await waitFor(() => assert.equal(mutationCalls.length, 1));
    const call = mutationCalls[0]!;
    assert.ok(call.url.includes("/api/v1/companies/c1/contacts"));
    assert.equal(call.method, "POST");
    assert.deepEqual(call.body, {
      name: "박담당",
      email: "park@example.com",
      isPrimary: true,
    });

    // Dialog closes on success.
    await waitFor(() => {
      assert.ok(!screen.queryByLabelText("이메일"), "dialog should close after success");
    });
  }),
);

test(
  "전문가 추가 dialog — validates required fields, then POSTs name/specialty",
  withDialogFetch(async () => {
    renderPartners();

    fireEvent.click(screen.getAllByText("전문가 추가")[0]!);
    assert.ok(await screen.findByLabelText("전문 분야"), "expert dialog should open");

    fireEvent.click(screen.getByText("추가"));
    assert.ok(await screen.findByText("전문가 이름을 입력해 주세요."));
    assert.ok(screen.getByText("전문 분야를 입력해 주세요."));
    assert.equal(mutationCalls.length, 0);

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "이전문" } });
    fireEvent.change(screen.getByLabelText("전문 분야"), { target: { value: "클라우드" } });
    fireEvent.click(screen.getByText("추가"));

    await waitFor(() => assert.equal(mutationCalls.length, 1));
    const call = mutationCalls[0]!;
    assert.ok(call.url.includes("/api/v1/companies/c1/experts"));
    assert.deepEqual(call.body, { name: "이전문", specialty: "클라우드", profile: {} });
  }),
);

test(
  "담당자 보관 — confirmation dialog gates the DELETE request",
  withDialogFetch(async () => {
    renderPartners();

    // Second company (베타) has a single contact → 담당자 보관 button exists.
    fireEvent.click(screen.getAllByText("담당자 보관")[0]!);
    assert.ok(
      await screen.findByText(/김담당 담당자를 보관 처리하시겠습니까/),
      "confirmation dialog should open",
    );
    assert.equal(mutationCalls.length, 0, "opening the dialog must not send a request");

    // Cancel closes without a request.
    fireEvent.click(screen.getByText("취소"));
    await waitFor(() => {
      assert.ok(!screen.queryByText(/보관 처리하시겠습니까/));
    });
    assert.equal(mutationCalls.length, 0, "cancel must not send a request");

    // Confirm sends the DELETE.
    fireEvent.click(screen.getAllByText("담당자 보관")[0]!);
    fireEvent.click(await screen.findByText("보관"));
    await waitFor(() => assert.equal(mutationCalls.length, 1));
    const call = mutationCalls[0]!;
    assert.equal(call.method, "DELETE");
    assert.ok(call.url.includes("/api/v1/company-contacts/ct1"));
  }),
);

test(
  "담당자 보관 — multi-contact company shows a picker and archives the chosen contact",
  withDialogFetch(async () => {
    renderPartners();

    // Third company (감마) has two contacts → second 담당자 보관 button.
    fireEvent.click(screen.getAllByText("담당자 보관")[1]!);
    assert.ok(
      await screen.findByText(/보관할 담당자를 선택해 주세요/),
      "picker prompt should be shown for multi-contact companies",
    );

    // Both contacts are listed; first is preselected and named in the summary.
    assert.ok(screen.getByDisplayValue("ct2"), "first contact should be listed");
    assert.ok(screen.getByDisplayValue("ct3"), "second contact should be listed");
    assert.ok(screen.getByText("이대표 담당자를 보관 처리합니다."));

    // Pick the second contact — the summary names the new selection.
    fireEvent.click(screen.getByDisplayValue("ct3"));
    assert.ok(await screen.findByText("최부담당 담당자를 보관 처리합니다."));
    assert.equal(mutationCalls.length, 0, "selection must not send a request");

    // Confirm deletes the SELECTED contact, not the first.
    fireEvent.click(screen.getByText("보관"));
    await waitFor(() => assert.equal(mutationCalls.length, 1));
    const call = mutationCalls[0]!;
    assert.equal(call.method, "DELETE");
    assert.ok(call.url.includes("/api/v1/company-contacts/ct3"));
  }),
);

test(
  "전문가 활성 관리 — picker names the selected expert and toggles only that expert",
  withDialogFetch(async () => {
    renderPartners();

    // Only 감마 has experts → single 전문가 활성 관리 button.
    fireEvent.click(screen.getByText("전문가 활성 관리"));
    assert.ok(
      await screen.findByText(/상태를 변경할 전문가를 선택해 주세요/),
      "picker prompt should be shown for multi-expert companies",
    );
    assert.ok(screen.getByDisplayValue("ex1"), "first expert should be listed");
    assert.ok(screen.getByDisplayValue("ex2"), "second expert should be listed");
    // First (active) expert preselected → summary and action say 비활성.
    assert.ok(screen.getByText(/정전문 전문가를\s*비활성 처리합니다\./));
    assert.ok(screen.getByText("비활성 처리"));

    // Pick the inactive expert — action flips to 활성.
    fireEvent.click(screen.getByDisplayValue("ex2"));
    assert.ok(await screen.findByText(/한전문 전문가를\s*활성 처리합니다\./));
    assert.equal(mutationCalls.length, 0, "opening/selecting must not send a request");

    // Confirm PATCHes the SELECTED expert with the flipped status.
    fireEvent.click(screen.getByText("활성 처리"));
    await waitFor(() => assert.equal(mutationCalls.length, 1));
    const call = mutationCalls[0]!;
    assert.equal(call.method, "PATCH");
    assert.ok(call.url.includes("/api/v1/company-experts/ex2/status"));
    assert.deepEqual(call.body, { isActive: true });
  }),
);
