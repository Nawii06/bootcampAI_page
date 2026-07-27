/**
 * Pure scheduling helpers for the session-expiry warning dialog.
 * Extracted from AuthContext so they can be unit-tested without DOM / React.
 */

/** Show the warning this many ms before server expiry (5 minutes). */
export const WARN_BEFORE_MS = 5 * 60 * 1000;

export interface SessionSchedule {
  /** True when we are already inside the warning window at call time. */
  showImmediately: boolean;
  /**
   * Seconds to display in the warning dialog when it first appears.
   *  - showImmediately=true  → time until expiry in seconds (at call time)
   *  - showImmediately=false → approx. WARN_BEFORE_MS / 1000 s (actual value
   *    is recomputed at timer-fire time so this is only used for assertions)
   */
  initialSecondsLeft: number;
  /**
   * ms to wait before showing the warning dialog.
   * 0 when showImmediately is true.
   */
  msUntilWarn: number;
  /** ms until the session expires from `nowMs`. */
  msUntilExpiry: number;
}

/**
 * Compute the session-expiry warning schedule from an ISO 8601 `expiresAt`
 * timestamp.
 *
 * @param expiresAt  ISO 8601 expiry timestamp returned by the server.
 * @param nowMs      Current epoch-ms reference (defaults to Date.now()).
 * @returns          Scheduling parameters, or `null` when already expired.
 */
export function computeSessionSchedule(
  expiresAt: string,
  nowMs: number = Date.now(),
): SessionSchedule | null {
  const msUntilExpiry = new Date(expiresAt).getTime() - nowMs;

  if (msUntilExpiry <= 0) {
    return null; // already expired
  }

  const msUntilWarn = msUntilExpiry - WARN_BEFORE_MS;

  if (msUntilWarn > 0) {
    // Session expires more than WARN_BEFORE_MS from now — schedule the warning.
    // At the moment the timer fires, msUntilExpiry ≈ WARN_BEFORE_MS, so the
    // dialog will start at ~WARN_BEFORE_MS/1000 seconds.
    return {
      showImmediately: false,
      initialSecondsLeft: Math.round(WARN_BEFORE_MS / 1000),
      msUntilWarn,
      msUntilExpiry,
    };
  } else {
    // Already inside the warning window — show the dialog immediately.
    const remaining = Math.round(msUntilExpiry / 1000);
    return {
      showImmediately: true,
      initialSecondsLeft: Math.max(0, remaining),
      msUntilWarn: 0,
      msUntilExpiry,
    };
  }
}
