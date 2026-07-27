/**
 * Unit tests for the clock-skew warning hysteresis in AuthContext's
 * refreshSession() offset-calibration branch.
 *
 * The real code computes `offset = serverNow − clientNowBeforeRequest`, then:
 *  - warns when |offset| > 60 s (SKEW_WARN_THRESHOLD_MS),
 *  - after a warning, re-warns only when the offset differs from the last
 *    warned value by more than 120 s (SKEW_REARM_DELTA_MS),
 *  - when skew drops back below the threshold after a warning, shows a
 *    one-time "기기 시계가 동기화되었습니다" confirmation and resets the
 *    warned offset so a future drift warns again immediately.
 *
 * This mirrors the branch verbatim as a pure simulation (same pattern as
 * dev/visibility-debounce.test.ts), driven by mocked serverNow/clientNow
 * pairs, so the state machine (warn → re-arm → sync-confirm → warn again)
 * has automated coverage.
 */
import assert from "node:assert/strict";
import test from "node:test";

const SKEW_WARN_THRESHOLD_MS = 60_000;
const SKEW_REARM_DELTA_MS = 120_000;

type SkewEvent =
  | { kind: "warn"; offset: number; minutes: number; direction: "늦습니다" | "앞서 있습니다" }
  | { kind: "synced" };

/**
 * Pure simulation of the offset-calibration branch of refreshSession().
 * State refs mirror lastWarnedOffsetRef and syncConfirmedRef.
 */
class ClockSkewMonitor {
  lastWarnedOffset: number | null = null;
  syncConfirmed = false;
  clockOffsetMs = 0;

  /**
   * Simulates one refreshSession() response carrying `serverNow`, captured
   * against `clientNowBeforeRequest`.  Returns the toast event fired, if any.
   */
  calibrate(serverNow: number, clientNowBeforeRequest: number): SkewEvent | null {
    const offset = serverNow - clientNowBeforeRequest;
    this.clockOffsetMs = offset;

    if (Math.abs(offset) > SKEW_WARN_THRESHOLD_MS) {
      const lastWarned = this.lastWarnedOffset;
      const shouldWarn =
        lastWarned === null || Math.abs(offset - lastWarned) > SKEW_REARM_DELTA_MS;
      if (shouldWarn) {
        this.lastWarnedOffset = offset;
        this.syncConfirmed = false;
        const minutes = Math.round(Math.abs(offset) / 60_000);
        const direction = offset > 0 ? "늦습니다" : "앞서 있습니다";
        return { kind: "warn", offset, minutes, direction };
      }
      return null;
    } else if (this.lastWarnedOffset !== null && !this.syncConfirmed) {
      this.syncConfirmed = true;
      this.lastWarnedOffset = null;
      return { kind: "synced" };
    }
    return null;
  }
}

/** Client clock anchor: an arbitrary epoch-ish base timestamp. */
const CLIENT_NOW = 1_000_000_000;

/** Helper: run a calibration where the server is `offsetMs` ahead of the client. */
function refreshWithOffset(monitor: ClockSkewMonitor, offsetMs: number): SkewEvent | null {
  return monitor.calibrate(CLIENT_NOW + offsetMs, CLIENT_NOW);
}

// ─── First warning ───────────────────────────────────────────────────────────

test("no warning when skew is at or below the 1-minute threshold", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 0), null);
  assert.equal(refreshWithOffset(m, 59_000), null);
  assert.equal(refreshWithOffset(m, 60_000), null); // boundary: strictly greater required
  assert.equal(refreshWithOffset(m, -60_000), null);
  assert.equal(m.lastWarnedOffset, null);
});

test("first warning fires when skew exceeds 1 minute (server ahead)", () => {
  const m = new ClockSkewMonitor();
  const event = refreshWithOffset(m, 90_000);
  assert.deepEqual(event, {
    kind: "warn",
    offset: 90_000,
    minutes: 2, // Math.round(90s / 60s) = 2
    direction: "늦습니다", // server ahead → client clock is slow
  });
  assert.equal(m.lastWarnedOffset, 90_000);
  assert.equal(m.syncConfirmed, false);
});

test("first warning fires for negative skew (client clock fast)", () => {
  const m = new ClockSkewMonitor();
  const event = refreshWithOffset(m, -180_000);
  assert.deepEqual(event, {
    kind: "warn",
    offset: -180_000,
    minutes: 3,
    direction: "앞서 있습니다", // server behind → client clock is fast
  });
});

test("clock offset is always calibrated even when no warning fires", () => {
  const m = new ClockSkewMonitor();
  refreshWithOffset(m, 30_000);
  assert.equal(m.clockOffsetMs, 30_000);
  refreshWithOffset(m, -500);
  assert.equal(m.clockOffsetMs, -500);
});

// ─── Re-warn hysteresis ──────────────────────────────────────────────────────

test("no re-warn when offset changes by 2 minutes or less since the last warning", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 90_000)?.kind, "warn");
  // Small drift within the re-arm delta: stays silent.
  assert.equal(refreshWithOffset(m, 100_000), null);
  assert.equal(refreshWithOffset(m, 150_000), null);
  assert.equal(refreshWithOffset(m, 210_000), null); // delta exactly 120s: strictly greater required
  // Warned offset is NOT updated by silent refreshes.
  assert.equal(m.lastWarnedOffset, 90_000);
});

test("re-warns when gradual drift exceeds 2 minutes since the last warned value", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 90_000)?.kind, "warn");
  assert.equal(refreshWithOffset(m, 150_000), null); // +60s: silent
  const event = refreshWithOffset(m, 211_000); // +121s vs last WARNED (90s), > 120s delta
  assert.equal(event?.kind, "warn");
  assert.equal(m.lastWarnedOffset, 211_000); // anchor moves to the new warned value
});

test("re-warns when the offset flips direction by more than the delta", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 70_000)?.kind, "warn");
  // -70s vs +70s → |delta| = 140s > 120s
  const event = refreshWithOffset(m, -70_000);
  assert.equal(event?.kind, "warn");
  assert.equal(m.lastWarnedOffset, -70_000);
});

// ─── One-time sync confirmation ──────────────────────────────────────────────

test("shows sync confirmation exactly once when skew drops below the threshold", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 90_000)?.kind, "warn");
  // Clock fixed: skew back under 1 minute.
  const event = refreshWithOffset(m, 5_000);
  assert.deepEqual(event, { kind: "synced" });
  // Subsequent small-skew refreshes stay silent (one-time only).
  assert.equal(refreshWithOffset(m, 3_000), null);
  assert.equal(refreshWithOffset(m, 0), null);
  assert.equal(m.lastWarnedOffset, null);
  assert.equal(m.syncConfirmed, true);
});

test("no sync confirmation when no warning was ever shown", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 30_000), null);
  assert.equal(refreshWithOffset(m, 0), null);
});

// ─── Re-warn after sync reset ────────────────────────────────────────────────

test("warns again immediately after a sync reset, even for a small over-threshold skew", () => {
  const m = new ClockSkewMonitor();
  assert.equal(refreshWithOffset(m, 90_000)?.kind, "warn");
  assert.equal(refreshWithOffset(m, 0)?.kind, "synced");
  // Drift past the threshold again: lastWarnedOffset was cleared, so the
  // 2-minute re-arm delta does NOT apply — warn fires right away.
  const event = refreshWithOffset(m, 61_001);
  assert.equal(event?.kind, "warn");
  assert.equal(m.syncConfirmed, false); // warning re-arms the sync confirmation
});

test("full cycle: warn → silent drift → re-warn → synced → warn again → synced again", () => {
  const m = new ClockSkewMonitor();
  const kinds = [
    refreshWithOffset(m, 70_000),   // warn (first)
    refreshWithOffset(m, 120_000),  // silent (delta 50s ≤ 120s)
    refreshWithOffset(m, 200_000),  // warn (delta 130s > 120s)
    refreshWithOffset(m, 10_000),   // synced (one-time)
    refreshWithOffset(m, 10_000),   // silent
    refreshWithOffset(m, -65_000),  // warn (fresh, after reset)
    refreshWithOffset(m, 0),        // synced again (re-armed by the new warning)
  ].map((e) => e?.kind ?? null);
  assert.deepEqual(kinds, ["warn", null, "warn", "synced", null, "warn", "synced"]);
});
