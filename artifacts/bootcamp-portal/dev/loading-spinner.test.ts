/**
 * Tests for loading spinner visibility across loading and loaded states.
 *
 * The portal has two spinner primitives:
 *   - `Spinner`    — a single Loader2 SVG with role="status" / aria-label="Loading"
 *   - `LoadingCard` — a card shell around Loader2 with a user-visible message
 *
 * These tests verify:
 *   1. Each component renders the expected accessibility attributes and copy.
 *   2. A conditional render shows the spinner while loading and hides it once
 *      data is available — catching broken conditional-render logic early.
 *
 * DOM environment (happy-dom) is provided by dev/setup-dom.ts.
 * Pattern follows dev/session-warning-buttons.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { Spinner } from "../src/components/ui/spinner.tsx";
import { LoadingCard } from "../src/components/LoadingCard.tsx";

function withCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
    }
  };
}

// ─── Spinner component ────────────────────────────────────────────────────────

test(
  "Spinner — renders with role=status so screen readers announce loading",
  withCleanup(() => {
    render(createElement(Spinner, null));
    const spinner = screen.getByRole("status");
    assert.ok(spinner, "Spinner should have role=status");
  }),
);

test(
  "Spinner — renders with aria-label='Loading' for accessible name",
  withCleanup(() => {
    render(createElement(Spinner, null));
    const spinner = screen.getByLabelText("Loading");
    assert.ok(spinner, "Spinner should be findable by aria-label='Loading'");
  }),
);

// ─── LoadingCard component ────────────────────────────────────────────────────

test(
  "LoadingCard — shows default loading message when no message prop provided",
  withCleanup(() => {
    render(createElement(LoadingCard, null));
    const msg = screen.getByText("불러오는 중입니다…");
    assert.ok(msg, "LoadingCard should show the default loading message");
  }),
);

test(
  "LoadingCard — shows a custom message when the message prop is provided",
  withCleanup(() => {
    render(createElement(LoadingCard, { message: "데이터를 가져오는 중…" }));
    const msg = screen.getByText("데이터를 가져오는 중…");
    assert.ok(msg, "LoadingCard should show the custom message");
  }),
);

// ─── Conditional loading / loaded pattern ─────────────────────────────────────
//
// Pages render a Spinner (or LoadingCard) while data is fetching, then
// replace it with real content once the query settles.  These tests verify
// that the conditional logic works correctly: spinner present while loading,
// absent (and content present) once loaded.

/**
 * Inline simulation of the conditional pattern used throughout the portal:
 *   if (isLoading) return <Spinner />;
 *   return <p>…content…</p>;
 */
function DataView({ isLoading, data }: { isLoading: boolean; data?: string }) {
  if (isLoading) return createElement(Spinner, null);
  return createElement("p", { "data-testid": "content" }, data ?? "(empty)");
}

test(
  "Loading state — spinner is visible and content is absent",
  withCleanup(() => {
    render(createElement(DataView, { isLoading: true, data: "학생 목록" }));

    // Spinner must be present
    const spinner = screen.getByRole("status");
    assert.ok(spinner, "spinner should be present while loading");

    // Content must NOT be present
    const content = screen.queryByTestId("content");
    assert.equal(content, null, "content should not render while loading");
  }),
);

test(
  "Loaded state — content is visible and spinner is absent",
  withCleanup(() => {
    render(createElement(DataView, { isLoading: false, data: "학생 목록" }));

    // Content must be present
    const content = screen.getByTestId("content");
    assert.ok(content, "content should render when not loading");
    assert.equal(content.textContent, "학생 목록");

    // Spinner must NOT be present
    const spinner = screen.queryByRole("status");
    assert.equal(spinner, null, "spinner should be absent when loaded");
  }),
);

// ─── LoadingCard conditional ──────────────────────────────────────────────────
//
// Same pattern with the card-based spinner used on full-page loading states.

function PageView({ isLoading, data }: { isLoading: boolean; data?: string }) {
  if (isLoading) return createElement(LoadingCard, { message: "세션 확인 중입니다…" });
  return createElement("main", { "data-testid": "page-content" }, data ?? "");
}

test(
  "LoadingCard state — loading message visible and page content absent",
  withCleanup(() => {
    render(createElement(PageView, { isLoading: true, data: "환영합니다" }));

    const msg = screen.getByText("세션 확인 중입니다…");
    assert.ok(msg, "loading message should be visible");

    const pageContent = screen.queryByTestId("page-content");
    assert.equal(pageContent, null, "page content should be hidden while loading");
  }),
);

test(
  "LoadingCard state — page content visible and loading message absent once loaded",
  withCleanup(() => {
    render(createElement(PageView, { isLoading: false, data: "환영합니다" }));

    const pageContent = screen.getByTestId("page-content");
    assert.ok(pageContent, "page content should render when not loading");
    assert.equal(pageContent.textContent, "환영합니다");

    const msg = screen.queryByText("세션 확인 중입니다…");
    assert.equal(msg, null, "loading message should be absent when loaded");
  }),
);
