/**
 * Tests for the main 감사로그 table's "더 보기" (load more) pagination on
 * the admin audit-logs page.
 *
 * The table loads pages of 100 via offset pagination and dedupes rows by
 * id (new events arriving between fetches can shift offsets so a page can
 * repeat an already-seen row). These tests stub fetch and assert:
 *   - the "더 보기" button shows only when more entries exist
 *   - clicking it appends the next page of rows
 *   - a duplicate id returned by a later page is not rendered twice
 *   - the "총 N건 중 M건 표시" footer matches the rendered rows
 *
 * The stub distinguishes the two sections on the page: the share-link
 * section always sends an `action=GENERATE_SHARE_TOKEN,...` filter, while
 * the main table sends no action filter here — share-section queries get
 * an empty response.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, cleanup, fireEvent } from "@testing-library/react";

import { renderPage, AUTH_ADMIN } from "./page-test-utils.ts";
import AdminAuditLogs from "../src/pages/admin/audit-logs.tsx";

const _originalFetch = globalThis.fetch;

function auditItem(id: string, index: number) {
  return {
    id,
    actorUserId: "00000000-0000-4000-8000-0000000000aa",
    actorDisplayName: `행위자-${index}`,
    actorRole: null,
    action: "UPDATE",
    resourceType: "STORED_FILE",
    resourceId: `res-${index}`,
    requestId: `req-${index}`,
    reason: null,
    changedFields: [],
    before: null,
    after: null,
    metadata: {},
    ipAddress: null,
    userAgent: null,
    occurredAt: new Date(Date.UTC(2026, 6, 1) - index * 60000).toISOString(),
  };
}

function itemId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Stub fetch for the main audit-log table.
 * - Share-link section queries (those with an `action` param) get an empty
 *   response so that section stays quiet.
 * - Main-table queries are answered from `pages` (keyed by page number);
 *   `total` is reported as given so button-visibility logic can be tested
 *   independently of row counts.
 */
function installMainLogFetch(
  pages: Record<number, ReturnType<typeof auditItem>[]>,
  total: number,
): void {
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input), "http://localhost");
    if (url.searchParams.get("action")) {
      return jsonResponse({
        data: [],
        meta: { page: 1, pageSize: 100, total: 0 },
      });
    }
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "100");
    return jsonResponse({
      data: pages[page] ?? [],
      meta: { page, pageSize, total },
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

function makePage(startIndex: number, count: number) {
  return Array.from({ length: count }, (_v, i) =>
    auditItem(itemId(startIndex + i), startIndex + i),
  );
}

test(
  "AdminAuditLogs — 더 보기 hidden when all entries fit on one page",
  withFetchCleanup(async () => {
    installMainLogFetch({ 1: makePage(0, 40) }, 40);
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });

    assert.ok(
      await screen.findByText(/총 40건 중 40건 표시/),
      "footer shows all 40 rows loaded",
    );
    assert.equal(
      screen.queryByText("더 보기"),
      null,
      "load-more button hidden when no further pages exist",
    );
  }),
);

test(
  "AdminAuditLogs — 더 보기 appends the next page and then disappears",
  withFetchCleanup(async () => {
    installMainLogFetch(
      { 1: makePage(0, 100), 2: makePage(100, 50) },
      150,
    );
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });

    const loadMore = await screen.findByText("더 보기");
    assert.ok(loadMore, "load-more button visible when more entries exist");
    assert.ok(
      await screen.findByText(/총 150건 중 100건 표시/),
      "footer counts first page only",
    );
    assert.ok(
      screen.getByText("행위자-0"),
      "first-page row rendered",
    );
    assert.equal(
      screen.queryByText("행위자-100"),
      null,
      "second-page row not rendered before clicking",
    );

    fireEvent.click(loadMore);

    assert.ok(
      await screen.findByText(/총 150건 중 150건 표시/),
      "footer matches appended rows after loading page 2",
    );
    assert.ok(screen.getByText("행위자-100"), "second-page row appended");
    assert.ok(
      screen.getByText("행위자-0"),
      "first-page rows still present after append",
    );
    assert.equal(
      screen.queryByText("더 보기"),
      null,
      "load-more button disappears once everything is loaded",
    );
  }),
);

test(
  "AdminAuditLogs — duplicate ids from offset shift are shown only once",
  withFetchCleanup(async () => {
    // Simulate new events arriving between fetches: page 2 starts with the
    // last two rows of page 1 (same ids) before continuing with new rows.
    const pageOne = makePage(0, 100);
    const pageTwo = [
      auditItem(itemId(98), 98),
      auditItem(itemId(99), 99),
      ...makePage(100, 48),
    ];
    installMainLogFetch({ 1: pageOne, 2: pageTwo }, 150);
    renderPage(createElement(AdminAuditLogs), { auth: AUTH_ADMIN });

    fireEvent.click(await screen.findByText("더 보기"));

    assert.ok(
      await screen.findByText("행위자-147"),
      "new rows from page 2 rendered",
    );
    assert.equal(
      screen.getAllByText("행위자-98").length,
      1,
      "duplicated row 98 rendered exactly once",
    );
    assert.equal(
      screen.getAllByText("행위자-99").length,
      1,
      "duplicated row 99 rendered exactly once",
    );
    // 100 + 48 unique rows (the two duplicates are deduped by id).
    assert.ok(
      screen.getByText(/총 150건 중 148건 표시/),
      "footer count matches deduped rendered rows",
    );
  }),
);
