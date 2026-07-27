/**
 * Component tests for SessionExpiryWarning button callbacks.
 *
 * Verifies that clicking "세션 연장" (Extend) calls `onExtend` exactly once
 * and clicking "나중에" (Dismiss) calls `onDismiss` exactly once, with no
 * cross-callback contamination.
 *
 * The DOM environment (happy-dom) is set up by `dev/setup-dom.ts`, which is
 * loaded via `--import` before this file is evaluated.
 */
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SessionExpiryWarning } from "../src/components/SessionExpiryWarning.tsx";

// @testing-library/react auto-calls cleanup() after each test when it
// detects jest/vitest; with Node's built-in runner we do it manually.
function withCleanup(fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
    } finally {
      cleanup();
    }
  };
}

// ─── Button callback tests ────────────────────────────────────────────────────

test(
  'SessionExpiryWarning — "세션 연장" button calls onExtend once and not onDismiss',
  withCleanup(() => {
    const onExtend = mock.fn();
    const onDismiss = mock.fn();

    render(
      createElement(SessionExpiryWarning, {
        secondsRemaining: 60,
        onExtend,
        onDismiss,
      }),
    );

    fireEvent.click(screen.getByText("세션 연장"));

    assert.equal(
      onExtend.mock.calls.length,
      1,
      "onExtend should be called exactly once",
    );
    assert.equal(
      onDismiss.mock.calls.length,
      0,
      "onDismiss should not be called when Extend is clicked",
    );
  }),
);

test(
  'SessionExpiryWarning — "나중에" button calls onDismiss once and not onExtend',
  withCleanup(() => {
    const onExtend = mock.fn();
    const onDismiss = mock.fn();

    render(
      createElement(SessionExpiryWarning, {
        secondsRemaining: 60,
        onExtend,
        onDismiss,
      }),
    );

    fireEvent.click(screen.getByText("나중에"));

    assert.equal(
      onDismiss.mock.calls.length,
      1,
      "onDismiss should be called exactly once",
    );
    assert.equal(
      onExtend.mock.calls.length,
      0,
      "onExtend should not be called when Dismiss is clicked",
    );
  }),
);

test(
  "SessionExpiryWarning — dialog shows the initial secondsRemaining as the countdown",
  withCleanup(() => {
    const onExtend = mock.fn();
    const onDismiss = mock.fn();

    render(
      createElement(SessionExpiryWarning, {
        secondsRemaining: 42,
        onExtend,
        onDismiss,
      }),
    );

    // The time label for 42 s should be "42초"
    const description = screen.getByText(/42초/);
    assert.ok(description, "countdown should show 42초 for secondsRemaining=42");
  }),
);
