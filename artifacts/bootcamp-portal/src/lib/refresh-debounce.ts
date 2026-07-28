/**
 * Pure in-flight / debounce-window guard for visibility- and BFCache-triggered
 * session refreshes, extracted from AuthContext so the app and its unit tests
 * (dev/visibility-debounce.test.ts) exercise the exact same logic.
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
 */

/** Minimum gap (ms) between visibility-triggered refreshes. */
export const VISIBILITY_DEBOUNCE_MS = 2_000;

/**
 * Mutable guard state.  In AuthContext this lives in a ref so it survives
 * re-renders without triggering them.
 */
export interface RefreshDebounceState {
  /**
   * Timestamp (Date.now()) set at the *start* of each refreshSession() call.
   * Initialised to 0 so the very first event is always allowed
   * (now − 0 >> VISIBILITY_DEBOUNCE_MS for real epoch values).
   */
  lastRefreshAt: number;
  /** True while a refreshSession() call is in flight. */
  isRefreshing: boolean;
}

export function createRefreshDebounceState(): RefreshDebounceState {
  return { lastRefreshAt: 0, isRefreshing: false };
}

/** Call at the very start of refreshSession(), before the fetch. */
export function markRefreshStart(state: RefreshDebounceState, now: number): void {
  state.lastRefreshAt = now;
  state.isRefreshing = true;
}

/** Call in the finally block of refreshSession(). */
export function markRefreshComplete(state: RefreshDebounceState): void {
  state.isRefreshing = false;
}

/**
 * Returns true when a visibility/pageshow event should trigger
 * refreshSession().  The in-flight guard takes priority; the time-window
 * guard uses a strict `<`, so an event exactly at the boundary is allowed.
 */
export function shouldRefresh(
  state: RefreshDebounceState,
  now: number,
  debounceMs: number = VISIBILITY_DEBOUNCE_MS,
): boolean {
  if (state.isRefreshing) return false;
  if (now - state.lastRefreshAt < debounceMs) return false;
  return true;
}
