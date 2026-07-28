/**
 * Unit tests for the visibilitychange/pageshow session-refresh debounce guard.
 *
 * These tests exercise the pure guard module `src/lib/refresh-debounce.ts` —
 * the exact code AuthContext imports for both its visibilitychange and
 * pageshow (BFCache) handlers — so inline edits to the guard logic cannot
 * drift away from the tests.
 *
 * Two complementary mechanisms prevent redundant /api/v1/session requests
 * when the user switches tabs rapidly:
 *
 *  1. In-flight guard (isRefreshing): if a refresh is already running,
 *     additional visibility events are dropped immediately.
 *  2. Time-window guard (lastRefreshAt): if a refresh *started* within
 *     VISIBILITY_DEBOUNCE_MS, subsequent events are also skipped.
 *
 * Both fields are updated at *request start* (not completion) so bursts
 * during a slow network round-trip are suppressed without waiting for
 * the response.
 *
 * NOTE on timestamps: `lastRefreshAt` is initialised to 0, so the very
 * first event is always allowed because `Date.now() - 0` is always
 * >> VISIBILITY_DEBOUNCE_MS for real epoch values.  Tests therefore use
 * T0 = 100_000 ms (100 s past epoch) so the same arithmetic holds:
 * T0 - 0 = 100_000 >> 2_000.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  VISIBILITY_DEBOUNCE_MS,
  createRefreshDebounceState,
  markRefreshComplete,
  markRefreshStart,
  shouldRefresh,
} from "../src/lib/refresh-debounce";

const DEBOUNCE_MS = VISIBILITY_DEBOUNCE_MS;
/** Base timestamp well past the epoch so (T0 - 0) >> DEBOUNCE_MS, matching real Date.now() behaviour. */
const T0 = 100_000;

test("visibility debounce — debounce window is 2 seconds", () => {
  assert.equal(VISIBILITY_DEBOUNCE_MS, 2_000);
});

// ─── In-flight guard ─────────────────────────────────────────────────────────

test("visibility debounce — first event triggers refresh when idle", () => {
  const state = createRefreshDebounceState();
  // T0 - 0 = 100_000 >> DEBOUNCE_MS, so the first event is always allowed
  assert.ok(shouldRefresh(state, T0), "should refresh when no prior request");
});

test("visibility debounce — second event is blocked while first is in flight", () => {
  const state = createRefreshDebounceState();
  markRefreshStart(state, T0);                    // request starts
  // 500 ms later another visibility event fires — request still in flight
  assert.equal(shouldRefresh(state, T0 + 500), false, "must not start while in-flight");
});

test("visibility debounce — event is blocked even after debounce window if still in flight", () => {
  const state = createRefreshDebounceState();
  markRefreshStart(state, T0);
  // Well beyond the 2 s window, but request hasn't completed yet (slow network)
  assert.equal(
    shouldRefresh(state, T0 + 10_000),
    false,
    "in-flight guard takes priority over time window",
  );
});

test("visibility debounce — event is allowed after in-flight completes and window expires", () => {
  const state = createRefreshDebounceState();
  markRefreshStart(state, T0);
  markRefreshComplete(state);                     // request finishes
  assert.ok(shouldRefresh(state, T0 + DEBOUNCE_MS + 1), "should allow refresh after window expires");
});

// ─── Time-window guard ───────────────────────────────────────────────────────

test("visibility debounce — event within debounce window is suppressed (not in flight)", () => {
  const state = createRefreshDebounceState();
  markRefreshStart(state, T0);
  markRefreshComplete(state);                     // request completes quickly
  // Another visibility event fires 1 s later — still within 2 s window
  assert.equal(shouldRefresh(state, T0 + 1_000), false, "within debounce window — suppress");
});

test("visibility debounce — event exactly at debounce boundary is allowed (guard is strict <)", () => {
  const state = createRefreshDebounceState();
  markRefreshStart(state, T0);
  markRefreshComplete(state);
  // At exactly DEBOUNCE_MS elapsed: DEBOUNCE_MS < DEBOUNCE_MS is false → allowed
  assert.ok(shouldRefresh(state, T0 + DEBOUNCE_MS), "at exact boundary — allowed (strict <)");
});

test("visibility debounce — event one ms before boundary is still suppressed", () => {
  const state = createRefreshDebounceState();
  markRefreshStart(state, T0);
  markRefreshComplete(state);
  assert.equal(shouldRefresh(state, T0 + DEBOUNCE_MS - 1), false, "one ms before boundary — suppress");
});

// ─── Rapid-tab-switch burst scenario ─────────────────────────────────────────

test("visibility debounce — burst of 5 rapid events triggers exactly one refresh", () => {
  const state = createRefreshDebounceState();
  let refreshCount = 0;

  // Simulate 5 visibility events 100 ms apart; first starts a slow request
  for (let i = 0; i < 5; i++) {
    const now = T0 + i * 100;
    if (shouldRefresh(state, now)) {
      refreshCount++;
      markRefreshStart(state, now);
      // Request is still in flight throughout all 5 events
    }
  }

  assert.equal(refreshCount, 1, "exactly one refresh should fire across 5 rapid events");
  assert.ok(state.isRefreshing, "guard should still be marked in-flight");
});

test("visibility debounce — after first burst completes, second burst (> 2 s later) fires once", () => {
  const state = createRefreshDebounceState();
  let refreshCount = 0;

  // First burst
  for (let i = 0; i < 3; i++) {
    const now = T0 + i * 50; // T0, T0+50, T0+100
    if (shouldRefresh(state, now)) {
      refreshCount++;
      markRefreshStart(state, now); // stamps lastRefreshAt = T0
    }
  }
  markRefreshComplete(state); // first request finishes

  // Second burst, DEBOUNCE_MS + 1 ms after the first request started
  for (let i = 0; i < 3; i++) {
    const now = T0 + DEBOUNCE_MS + 1 + i * 50; // T0+2001, T0+2051, T0+2101
    if (shouldRefresh(state, now)) {
      refreshCount++;
      markRefreshStart(state, now);
    }
  }

  assert.equal(refreshCount, 2, "one refresh per burst, two bursts total");
});
