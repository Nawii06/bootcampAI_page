/**
 * Component tests for the SessionExpiryWarning tab-title flashing behaviour.
 *
 * The component flashes the browser tab title (alternating every 2 s between
 * "⚠️ 세션 만료 임박 — <original>" and the original title) ONLY while the tab
 * is hidden. On return to the tab (visibilitychange → visible) the flashing
 * stops and the original title is restored; on unmount the title is restored
 * regardless of visibility.
 *
 * These tests render the real component, control `document.hidden` via
 * Object.defineProperty, dispatch real `visibilitychange` events, and drive
 * the 2-second flash interval with Node's mock timers.
 *
 * NOTE: only the `setInterval` API is mocked — `Date` is left real so the
 * countdown effect (which anchors to Date.now()) computes a stable value and
 * doesn't interfere with title assertions.
 */
import test from "node:test";
import { mock } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { SessionExpiryWarning } from "../src/components/SessionExpiryWarning.tsx";

const ORIGINAL = "부트캠프 포털";
const WARNING = `⚠️ 세션 만료 임박 — ${ORIGINAL}`;

/** Overrides document.hidden (configurable so tests can toggle repeatedly). */
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    get: () => hidden,
    configurable: true,
  });
}

function dispatchVisibilityChange(): void {
  fireEvent(document, new Event("visibilitychange"));
}

function renderWarning() {
  return render(
    createElement(SessionExpiryWarning, {
      secondsRemaining: 300,
      onExtend: () => {},
      onDismiss: () => {},
    }),
  );
}

/** Common setup/teardown: mock interval timers, fixed title, visible tab. */
function flashTest(name: string, fn: () => void) {
  test(name, () => {
    mock.timers.enable({ apis: ["setInterval"] });
    document.title = ORIGINAL;
    setHidden(false);
    try {
      fn();
    } finally {
      cleanup();
      mock.timers.reset();
      setHidden(false);
    }
  });
}

// ─── No flashing while visible ───────────────────────────────────────────────

flashTest(
  "tab title — does NOT flash while the tab is visible",
  () => {
    renderWarning();

    assert.equal(document.title, ORIGINAL, "title unchanged on mount");

    // Even after several flash-interval periods, the title must stay put.
    mock.timers.tick(2000);
    assert.equal(document.title, ORIGINAL);
    mock.timers.tick(2000);
    assert.equal(document.title, ORIGINAL);
  },
);

// ─── Flashing starts when the tab is hidden ──────────────────────────────────

flashTest(
  "tab title — starts flashing when the tab becomes hidden",
  () => {
    renderWarning();

    setHidden(true);
    dispatchVisibilityChange();

    // Warning title shown immediately on hide.
    assert.equal(document.title, WARNING, "warning title set immediately");

    // Alternates every 2 s: warning → original → warning …
    mock.timers.tick(2000);
    assert.equal(document.title, ORIGINAL, "alternates back to original");
    mock.timers.tick(2000);
    assert.equal(document.title, WARNING, "alternates back to warning");
  },
);

flashTest(
  "tab title — flashes immediately if the tab is already hidden on mount",
  () => {
    setHidden(true);
    renderWarning();

    assert.equal(document.title, WARNING, "flashing starts on mount");
    mock.timers.tick(2000);
    assert.equal(document.title, ORIGINAL);
  },
);

// ─── Flashing stops and title restores on return ─────────────────────────────

flashTest(
  "tab title — stops flashing and restores title when the tab becomes visible again",
  () => {
    renderWarning();

    setHidden(true);
    dispatchVisibilityChange();
    mock.timers.tick(2000); // mid-flash (title currently ORIGINAL or WARNING)

    setHidden(false);
    dispatchVisibilityChange();

    assert.equal(document.title, ORIGINAL, "title restored on return");

    // The interval must be cleared: no further alternation.
    mock.timers.tick(2000);
    assert.equal(document.title, ORIGINAL, "no flashing after return");
    mock.timers.tick(4000);
    assert.equal(document.title, ORIGINAL);
  },
);

flashTest(
  "tab title — rapid hide/show/hide toggling resumes flashing cleanly",
  () => {
    renderWarning();

    // Rapid burst: hidden → visible → hidden with no timer ticks between.
    setHidden(true);
    dispatchVisibilityChange();
    setHidden(false);
    dispatchVisibilityChange();
    assert.equal(document.title, ORIGINAL, "restored after quick return");

    setHidden(true);
    dispatchVisibilityChange();
    assert.equal(document.title, WARNING, "flashing resumes on re-hide");

    // Only ONE interval must be active (no duplicates from the burst):
    // one 2 s tick flips the title exactly once, to the original.
    mock.timers.tick(2000);
    assert.equal(
      document.title,
      ORIGINAL,
      "single interval — one tick flips title exactly once",
    );
  },
);

flashTest(
  "tab title — duplicate hidden events do not stack intervals",
  () => {
    renderWarning();

    setHidden(true);
    dispatchVisibilityChange();
    dispatchVisibilityChange(); // second hidden event while already flashing

    assert.equal(document.title, WARNING);
    mock.timers.tick(2000);
    assert.equal(
      document.title,
      ORIGINAL,
      "one tick flips once — a stacked interval would flip twice",
    );
  },
);

// ─── Title restored on unmount ───────────────────────────────────────────────

flashTest(
  "tab title — restored on unmount while hidden and flashing",
  () => {
    const { unmount } = renderWarning();

    setHidden(true);
    dispatchVisibilityChange();
    mock.timers.tick(2000); // let it alternate at least once
    assert.notEqual(document.title, undefined);

    unmount();

    assert.equal(document.title, ORIGINAL, "title restored on unmount");
    mock.timers.tick(4000);
    assert.equal(document.title, ORIGINAL, "no flashing after unmount");
  },
);

flashTest(
  "tab title — unmount while visible leaves title untouched",
  () => {
    const { unmount } = renderWarning();
    assert.equal(document.title, ORIGINAL);

    unmount();
    assert.equal(document.title, ORIGINAL);
  },
);
