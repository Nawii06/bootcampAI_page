/**
 * Public share-link receiving-end tests — public portfolio page.
 *
 * dev/copy-link-success.test.ts proves the copied URL is
 * `{origin}/public/portfolio/{token}`; these tests prove that visiting that
 * URL actually works for an anonymous visitor:
 *   1. A valid token renders the shared record's title and summary
 *      (fixture data mirrors the record used in copy-link-success.test.ts).
 *   2. An invalid or revoked (링크 해제 → API 404/410) token shows the clear
 *      "포트폴리오를 찾을 수 없습니다" message — never a blank page or crash.
 *
 * DOM environment: happy-dom (setup-dom.ts). The page reads `:token` via
 * wouter useParams, so it is mounted inside a memory Router.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, cleanup } from "@testing-library/react";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { renderPage, AUTH_LOADING } from "./page-test-utils.ts";
import PublicPortfolio from "../src/pages/public/portfolio.tsx";

// ─── Fixture (mirrors the record shared in copy-link-success.test.ts) ────────

const VALID_TOKEN = "tok-abc123";
const PORTFOLIO = {
  title: "자율주행 로봇 프로젝트",
  summary: "ROS2 기반 자율주행 로봇 개발",
  techStack: ["Python", "ROS2"],
  outputLinks: ["https://github.com/example/robot"],
  createdAt: "2026-06-01T00:00:00.000Z",
};

// ─── Fetch stub: valid token → 200 portfolio, anything else → 404 ───────────

interface RecordedRequest {
  url: string;
  method: string;
}

const _originalFetch = globalThis.fetch;
let _requests: RecordedRequest[] = [];

function installPublicPortfolioFetch(): void {
  _requests = [];
  globalThis.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    _requests.push({ url, method: (init?.method ?? "GET").toUpperCase() });
    if (url === `/api/v1/public/portfolio/${VALID_TOKEN}`) {
      return Promise.resolve(
        new Response(JSON.stringify(PORTFOLIO), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ error: { message: "link revoked" } }), {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "application/json" },
      }),
    );
  };
}

// ─── Render helper: mount at /portfolio/:token as an anonymous visitor ──────

function renderPublicPortfolioAt(token: string) {
  const { hook } = memoryLocation({ path: `/portfolio/${token}` });
  return renderPage(
    createElement(
      Router,
      { hook },
      createElement(
        Route,
        { path: "/portfolio/:token" },
        createElement(PublicPortfolio),
      ),
    ),
    // Anonymous visitor: no logged-in user.
    { auth: AUTH_LOADING },
  );
}

function withPublicFetch(fn: () => void | Promise<void>) {
  return async () => {
    installPublicPortfolioFetch();
    try {
      await fn();
    } finally {
      cleanup();
      globalThis.fetch = _originalFetch;
    }
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test(
  "a valid share token renders the matching portfolio's title and summary",
  withPublicFetch(async () => {
    renderPublicPortfolioAt(VALID_TOKEN);

    assert.ok(
      await screen.findByText(PORTFOLIO.title),
      "the shared record's title must be rendered",
    );
    assert.ok(
      screen.getByText(PORTFOLIO.summary),
      "the shared record's summary must be rendered",
    );
    // The page fetched exactly the copied token's endpoint.
    assert.ok(
      _requests.some(
        (r) =>
          r.method === "GET" &&
          r.url === `/api/v1/public/portfolio/${VALID_TOKEN}`,
      ),
      "the page must GET /api/v1/public/portfolio/{token} for the visited token",
    );
    // No error UIs bleed through on success.
    assert.equal(
      screen.queryByText("포트폴리오를 찾을 수 없습니다"),
      null,
      "the not-found UI must not appear for a valid token",
    );
    assert.equal(
      screen.queryByText("포트폴리오를 불러오지 못했습니다."),
      null,
      "the generic error UI must not appear for a valid token",
    );
  }),
);

test(
  "an invalid or revoked token shows the clear not-found message, not a blank page",
  withPublicFetch(async () => {
    renderPublicPortfolioAt("tok-revoked-or-bogus");

    assert.ok(
      await screen.findByText("포트폴리오를 찾을 수 없습니다"),
      "a revoked/invalid token must show the not-found headline",
    );
    assert.ok(
      screen.getByText("링크가 만료되었거나 비공개 상태입니다."),
      "the not-found UI must explain the link is expired or private",
    );
    // No portfolio content or crash-y blank state.
    assert.equal(
      screen.queryByText(PORTFOLIO.title),
      null,
      "no portfolio content may render for an invalid token",
    );
    assert.equal(
      screen.queryAllByText("다시 시도").length,
      0,
      "no retry button — the link is permanently gone",
    );
  }),
);
