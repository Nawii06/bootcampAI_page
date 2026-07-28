/**
 * Pure clock-skew warning hysteresis state machine, extracted from the
 * offset-calibration branch of AuthContext's refreshSession() so that both
 * the app and its tests exercise the exact same logic.
 *
 * Behavior:
 *  - warns when |offset| > SKEW_WARN_THRESHOLD_MS,
 *  - after a warning, re-warns only when the offset differs from the last
 *    warned value by more than SKEW_REARM_DELTA_MS (hysteresis, so gradual
 *    drift triggers a new nudge without spamming on every refresh),
 *  - when skew drops back below the threshold after a warning, emits a
 *    one-time "synced" confirmation and clears the warned offset so a
 *    future drift past the threshold warns again immediately.
 */

/** Warn when |offset| exceeds this (1 minute). */
export const SKEW_WARN_THRESHOLD_MS = 60_000;
/** After a warning, re-warn only when the offset moved more than this (2 minutes). */
export const SKEW_REARM_DELTA_MS = 120_000;

export type SkewEvent =
  | {
      kind: "warn";
      offset: number;
      minutes: number;
      direction: "늦습니다" | "앞서 있습니다";
    }
  | { kind: "synced" };

/**
 * Mutable hysteresis state.  In AuthContext this lives in a ref so it
 * survives re-renders without triggering them.
 */
export interface ClockSkewState {
  /**
   * Offset (ms) recorded at the moment the last warning fired, or null when
   * no warning has fired yet (or after the "synced" reset).
   */
  lastWarnedOffset: number | null;
  /**
   * Guards the one-time "clock is back in sync" confirmation so it only
   * shows once after a warning.
   */
  syncConfirmed: boolean;
}

export function createClockSkewState(): ClockSkewState {
  return { lastWarnedOffset: null, syncConfirmed: false };
}

/**
 * Runs one calibration step against the given offset
 * (offset = serverNow − clientNowBeforeRequest; positive → server ahead).
 * Mutates `state` and returns the toast event to show, if any.
 */
export function calibrateClockSkew(
  state: ClockSkewState,
  offset: number,
): SkewEvent | null {
  if (Math.abs(offset) > SKEW_WARN_THRESHOLD_MS) {
    const lastWarned = state.lastWarnedOffset;
    const shouldWarn =
      lastWarned === null || Math.abs(offset - lastWarned) > SKEW_REARM_DELTA_MS;
    if (shouldWarn) {
      state.lastWarnedOffset = offset;
      state.syncConfirmed = false;
      const minutes = Math.round(Math.abs(offset) / 60_000);
      // offset > 0 → server is ahead → client clock is slow/late
      // offset < 0 → server is behind → client clock is fast/early
      const direction = offset > 0 ? "늦습니다" : "앞서 있습니다";
      return { kind: "warn", offset, minutes, direction };
    }
    return null;
  } else if (state.lastWarnedOffset !== null && !state.syncConfirmed) {
    // Skew dropped back below the threshold after a warning — confirm once
    // that the clock is in sync, and clear the warned offset so a future
    // drift past the threshold warns again immediately.
    state.syncConfirmed = true;
    state.lastWarnedOffset = null;
    return { kind: "synced" };
  }
  return null;
}
