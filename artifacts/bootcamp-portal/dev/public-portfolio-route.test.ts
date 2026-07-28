/**
 * Route-registration tests — copied share URL vs. the app's real route table.
 *
 * dev/copy-link-success.test.ts proves the copied URL is
 * `{origin}/public/portfolio/{token}`, and dev/public-portfolio-view.test.ts
 * mounts PublicPortfolio at an arbitrary memory-router path. Neither proves
 * that App.tsx actually registers that path. These tests render App.tsx's
 * real <Router /> (its full route table) inside a memory router and confirm:
 *   1. Visiting exactly the path the 링크 복사 button copies
 *      (publicPortfolioPath(token)) renders the PublicPortfolio page —
 *      not the NotFound fallback.
 *   2. The shared constant both ends derive from still has the expected
 *      shape, and a near-miss path falls through to NotFound (the match in
 *      test 1 is a real route match, not an over-greedy fallback).
 *
 * DOM environment: happy-dom (setup-dom.ts).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { screen, cleanup } from "@testing-library/react";
import { Router as WouterRouter } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { renderPage, AUTH_LOADING } from "./page-test-utils.ts";
import { Router as AppRouter } from "../src/App.tsx";
import {
  PUBLIC_PORTFOLIO_ROUTE,
  publicPortfolioPath,
} from "../src/lib/routes.ts";

// ─── Fixture (mirrors copy-link-success.test.ts / public-portfolio-view) ─────

const VALID_TOKEN = "tok-abc123";
const PORTFOLIO = {
  title: "자율주행 로봇 프로젝트",
  summary: "ROS2 기반 자율주행 로봇 개발",
  techStack: ["Python", "ROS2"],
  outputLinks: [],
  createdAt: "2026-06-01T00:00:00.000Z",
};

// ─── Fetch stub: valid token → 200 portfolio, anything else → 404 ───────────

const _originalFetch = globalThis.fetch;

function installFetch(): void {
  globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url === `/api/v1/public/portfolio/${VALID_TOKEN}`) {
      return Promise.resolve(
        new Response(JSON.stringify(PORTFOLIO), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ error: { message: "not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
  };
}

// ─── Render helper: mount the REAL app route table at a given path ──────────

function renderAppRouterAt(path: string) {
  const { hook } = memoryLocation({ path });
  return renderPage(
    createElement(WouterRouter, { hook }, createElement(AppRouter)),
    // Anonymous visitor: share links must work without login.
    { auth: AUTH_LOADING },
  );
}

function withRouteTest(fn: () => void | Promise<void>) {
  return async () => {
    installFetch();
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
  "the exact path copied by 링크 복사 renders PublicPortfolio via the real app route table",
  withRouteTest(async () => {
    renderAppRouterAt(publicPortfolioPath(VALID_TOKEN));

    // PublicPortfolio fetched and rendered the shared record.
    assert.ok(
      await screen.findByText(PORTFOLIO.title),
      "the app's route table must route the copied URL path to PublicPortfolio",
    );
    // And it did not fall through to the 404 page.
    assert.equal(
      screen.queryByText("404 Page Not Found"),
      null,
      "the copied URL path must not hit the NotFound fallback",
    );
  }),
);

test(
  "the route constant keeps the copied-URL shape, and near-miss paths 404",
  withRouteTest(async () => {
    // Both the copied URL and the route registration derive from this one
    // constant; verify the constant itself still has the published shape.
    assert.equal(PUBLIC_PORTFOLIO_ROUTE, "/public/portfolio/:token");
    assert.equal(
      publicPortfolioPath("tok-x"),
      "/public/portfolio/tok-x",
      "publicPortfolioPath must substitute the :token segment",
    );

    // A near-miss path (extra segment) must fall through to NotFound,
    // proving the positive test above matched a real route.
    renderAppRouterAt(`/public/portfolio/${VALID_TOKEN}/extra`);
    assert.ok(
      await screen.findByText(/Page Not Found/i),
      "a path not in the route table must render the NotFound page",
    );
    assert.equal(
      screen.queryByText(PORTFOLIO.title),
      null,
      "no portfolio content may render for a non-registered path",
    );
  }),
);
