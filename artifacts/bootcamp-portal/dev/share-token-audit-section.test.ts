/**
 * Tests for the "포트폴리오 공유 링크 이력" section on the admin audit-logs page.
 *
 * The section issues one audit-log query with a multi-action filter
 * (action=GENERATE_SHARE_TOKEN,REVOKE_SHARE_TOKEN, resourceType=
 * EXPERIENTIAL_RECORD), server-sorted by occurredAt desc. These tests stub
 * fetch to answer based on the `action` query param and assert:
 *   - both actions render with their Korean labels
 *   - the actor display name is shown
 *   - an empty result shows the dedicated empty message
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, cleanup, fireEvent } from "@testing-library/react";

import { renderPage, AUTH_ADMIN } from "./page-test-utils.ts";
import AdminAuditLogs from "../src/pages/admin/audit-logs.tsx";

const _originalFetch = globalThis.fetch;

function auditItem(overrides: Record<string, unknown>) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    actorUserId: "00000000-0000-4000-8000-0000000000aa",
    actorDisplayName: "감사 담당자",
    actorRole: null,
    action: "GENERATE_SHARE_TOKEN",
    resourceType: "EXPERIENTIAL_RECORD",
    resourceId: "rec-1",
    requestId: "req-1",
    reason: null,
    changedFields: [],
    before: null,
    after: null,
    metadata: {},
    ipAddress: null,
    userAgent: null,
    occurredAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stub fetch: answers audit-log queries per `action` param (supports
 * comma-separated multi-action filters); others empty. */
function installShareTokenFetch(
  byAction: Record<string, ReturnType<typeof auditItem>[]>,
): void {
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input), "http://localhost");
    const actions = (url.searchParams.get("action") ?? "")
      .split(",")
      .filter(Boolean);
    const data = actions
      .flatMap((action) => byAction[action] ?? [])
      .sort(
        (a, b) =>
          new Date(String(b.occurredAt)).getTime() -
          new Date(String(a.occurredAt)).getTime(),
      );
    return jsonResponse({
      data,
      meta: { page: 1, pageSize: 100, total: data.length },
    });
  };
}

function withFetchCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
      globalThis.fetch = _originalFetch;
    }
  };
}

test(
  "AdminAuditLogs — share-link section lists generate and revoke events with actor and labels",
  withFetchCleanup(async () => {
    installShareTokenFetch({
      GENERATE_SHARE_TOKEN: [
        auditItem({
          id: "00000000-0000-4000-8000-000000000001",
          actorDisplayName: "김학생",
          resourceId: "rec-abc",
          occurredAt: "2026-07-20T10:00:00.000Z",
        }),
      ],
      REVOKE_SHARE_TOKEN: [
        auditItem({
          id: "00000000-0000-4000-8000-000000000002",
          action: "REVOKE_SHARE_TOKEN",
          actorDisplayName: "박관리자",
          resourceId: "rec-abc",
          occurredAt: "2026-07-21T09:00:00.000Z",
        }),
      ],
    });
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });

    assert.ok(
      screen.getByText("포트폴리오 공유 링크 이력"),
      "section heading should be visible",
    );
    assert.ok(await screen.findByText("링크 발급"), "generate event labeled");
    assert.ok(screen.getByText("링크 회수"), "revoke event labeled");
    assert.ok(screen.getByText("김학생"), "generate actor shown");
    assert.ok(screen.getByText("박관리자"), "revoke actor shown");
    assert.ok(
      screen.queryAllByText("rec-abc").length >= 2,
      "record id shown for both events",
    );
  }),
);

/**
 * Stub fetch with paging: each action returns `pageSize` items per page up
 * to `totalPerAction`, so the section must expose a "load more" control.
 */
function installPagedShareTokenFetch(totalPerAction: number): void {
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input), "http://localhost");
    const actions = (url.searchParams.get("action") ?? "")
      .split(",")
      .filter(Boolean);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "100");
    const total = totalPerAction * actions.length;
    const start = (page - 1) * pageSize;
    const count = Math.max(0, Math.min(pageSize, total - start));
    const data = Array.from({ length: count }, (_v, i) => {
      const index = start + i;
      const action = actions[index % actions.length] ?? "GENERATE_SHARE_TOKEN";
      return auditItem({
        id: `00000000-0000-4000-8000-${action === "REVOKE_SHARE_TOKEN" ? "9" : "1"}${String(index).padStart(11, "0")}`,
        action,
        actorDisplayName: `행위자-${action}-${index}`,
        occurredAt: new Date(
          Date.UTC(2026, 6, 1, 0, 0, 0) - index * 60000,
        ).toISOString(),
      });
    });
    return jsonResponse({
      data,
      meta: { page, pageSize, total },
    });
  };
}

test(
  "AdminAuditLogs — share-link section pages through more than 100 events per action",
  withFetchCleanup(async () => {
    installPagedShareTokenFetch(150);
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });

    const loadMore = await screen.findByText("이력 더 보기");
    assert.ok(loadMore, "load-more button visible when more pages exist");
    assert.ok(
      await screen.findByText(/총 300건 중 100건 표시/),
      "total reflects all events, shown count reflects loaded rows",
    );

    fireEvent.click(loadMore);
    assert.ok(
      await screen.findByText(/총 300건 중 200건 표시/),
      "second page appends another server page of rows",
    );

    fireEvent.click(await screen.findByText("이력 더 보기"));

    assert.ok(
      await screen.findByText(/총 300건 중 300건 표시/),
      "after loading the last page, all events are reachable",
    );
    assert.equal(
      screen.queryByText("이력 더 보기"),
      null,
      "load-more button disappears when everything is loaded",
    );
  }),
);

test(
  "AdminAuditLogs — share-link section shows empty message when no events exist",
  withFetchCleanup(async () => {
    installShareTokenFetch({});
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });

    assert.ok(
      await screen.findByText("공유 링크 발급·회수 이력이 없습니다."),
      "empty state message should be visible",
    );
  }),
);
