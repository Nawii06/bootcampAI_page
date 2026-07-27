/**
 * Unit tests for the visibilitychange session-refresh debounce guard.
 *
 * AuthContext uses two complementary mechanisms to prevent redundant
 * /api/v1/session requests when the user switches tabs rapidly:
 *
 *  1. In-flight guard (isRefreshing): if a refresh is already running,
 *     additional visibility events are dropped immediately.
 *  2. Time-window guard (lastRefreshAt): if a refresh *started* within
 *     DEBOUNCE_MS, subsequent events are also skipped.
 *
 * Both refs are updated at *request start* (not completion) so bursts
 * during a slow network round-trip are suppressed without waiting for
 * the response.
 *
 * NOTE on timestamps: `lastRefreshAtRef` is initialised to 0 in the real
 * code, so the very first event is always allowed because
 * `Date.now() - 0` is always >> DEBOUNCE_MS for real epoch values.
 * Tests therefore use T0 = 100_000 ms (100 s past epoch) so the same
 * arithmetic holds: T0 - 0 = 100_000 >> 2_000.
 */
import assert from "node:assert/strict";
import test from "node:test";

const DEBOUNCE_MS = 2_000;
/** Base timestamp well past the epoch so (T0 - 0) >> DEBOUNCE_MS, matching real Date.now() behaviour. */
const T0 = 100_000;

/**
 * Pure simulation of the two-ref guard used in AuthContext's
 * visibilitychange handler.
 */
class VisibilityRefreshGuard {
  lastRefreshAt = 0;
  isRefreshing = false;

  /** Called at the very start of refreshSession(), before the fetch. */
  startRefresh(now: number): void {
    this.lastRefreshAt = now;
    this.isRefreshing = true;
  }

  /** Called in the finally block of refreshSession(). */
  completeRefresh(): void {
    this.isRefreshing = false;
  }

  /**
   * Returns true when a visibility event should trigger refreshSession().
   * Mirrors the guard in handleVisibilityChange().
   */
  shouldRefresh(now: number): boolean {
    if (this.isRefreshing) return false;
    if (now - this.lastRefreshAt < DEBOUNCE_MS) return false;
    return true;
  }
}

// ─── In-flight guard ─────────────────────────────────────────────────────────

test("visibility debounce — first event triggers refresh when idle", () => {
  const guard = new VisibilityRefreshGuard();
  // T0 - 0 = 100_000 >> DEBOUNCE_MS, so the first event is always allowed
  assert.ok(guard.shouldRefresh(T0), "should refresh when no prior request");
});

test("visibility debounce — second event is blocked while first is in flight", () => {
  const guard = new VisibilityRefreshGuard();
  guard.startRefresh(T0);                         // request starts
  // 500 ms later another visibility event fires — request still in flight
  assert.equal(guard.shouldRefresh(T0 + 500), false, "must not start while in-flight");
});

test("visibility debounce — event is blocked even after debounce window if still in flight", () => {
  const guard = new VisibilityRefreshGuard();
  guard.startRefresh(T0);
  // Well beyond the 2 s window, but request hasn't completed yet (slow network)
  assert.equal(
    guard.shouldRefresh(T0 + 10_000),
    false,
    "in-flight guard takes priority over time window",
  );
});

test("visibility debounce — event is allowed after in-flight completes and window expires", () => {
  const guard = new VisibilityRefreshGuard();
  guard.startRefresh(T0);
  guard.completeRefresh();                        // request finishes
  assert.ok(guard.shouldRefresh(T0 + DEBOUNCE_MS + 1), "should allow refresh after window expires");
});

// ─── Time-window guard ───────────────────────────────────────────────────────

test("visibility debounce — event within debounce window is suppressed (not in flight)", () => {
  const guard = new VisibilityRefreshGuard();
  guard.startRefresh(T0);
  guard.completeRefresh();                        // request completes quickly
  // Another visibility event fires 1 s later — still within 2 s window
  assert.equal(guard.shouldRefresh(T0 + 1_000), false, "within debounce window — suppress");
});

test("visibility debounce — event exactly at debounce boundary is allowed (guard is strict <)", () => {
  const guard = new VisibilityRefreshGuard();
  guard.startRefresh(T0);
  guard.completeRefresh();
  // At exactly DEBOUNCE_MS elapsed: DEBOUNCE_MS < DEBOUNCE_MS is false → allowed
  assert.ok(guard.shouldRefresh(T0 + DEBOUNCE_MS), "at exact boundary — allowed (strict <)");
});

test("visibility debounce — event one ms before boundary is still suppressed", () => {
  const guard = new VisibilityRefreshGuard();
  guard.startRefresh(T0);
  guard.completeRefresh();
  assert.equal(guard.shouldRefresh(T0 + DEBOUNCE_MS - 1), false, "one ms before boundary — suppress");
});

// ─── Rapid-tab-switch burst scenario ─────────────────────────────────────────

test("visibility debounce — burst of 5 rapid events triggers exactly one refresh", () => {
  const guard = new VisibilityRefreshGuard();
  let refreshCount = 0;

  // Simulate 5 visibility events 100 ms apart; first starts a slow request
  for (let i = 0; i < 5; i++) {
    const now = T0 + i * 100;
    if (guard.shouldRefresh(now)) {
      refreshCount++;
      guard.startRefresh(now);
      // Request is still in flight throughout all 5 events
    }
  }

  assert.equal(refreshCount, 1, "exactly one refresh should fire across 5 rapid events");
  assert.ok(guard.isRefreshing, "guard should still be marked in-flight");
});

test("visibility debounce — after first burst completes, second burst (> 2 s later) fires once", () => {
  const guard = new VisibilityRefreshGuard();
  let refreshCount = 0;

  // First burst
  for (let i = 0; i < 3; i++) {
    const now = T0 + i * 50; // T0, T0+50, T0+100
    if (guard.shouldRefresh(now)) {
      refreshCount++;
      guard.startRefresh(now); // stamps lastRefreshAt = T0
    }
  }
  guard.completeRefresh(); // first request finishes

  // Second burst, DEBOUNCE_MS + 1 ms after the first request started
  for (let i = 0; i < 3; i++) {
    const now = T0 + DEBOUNCE_MS + 1 + i * 50; // T0+2001, T0+2051, T0+2101
    if (guard.shouldRefresh(now)) {
      refreshCount++;
      guard.startRefresh(now);
    }
  }

  assert.equal(refreshCount, 2, "one refresh per burst, two bursts total");
});
