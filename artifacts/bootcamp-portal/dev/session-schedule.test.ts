/**
 * Unit tests for session-expiry scheduling logic.
 *
 * Tests AuthContext's scheduleFromExpiry behaviour through the pure
 * computeSessionSchedule() helper, and verifies that the session-extend
 * flow produces correct warningSecondsLeft values.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { computeSessionSchedule, WARN_BEFORE_MS } from "../src/lib/session-schedule.ts";

const ONE_MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = WARN_BEFORE_MS; // 300_000

// ─── scheduleFromExpiry — expiry > 5 min away ────────────────────────────────

test("scheduleFromExpiry — session expiring in >5 min does NOT show warning immediately", () => {
  const nowMs = 1_000_000_000_000; // fixed reference epoch
  const tenMinutesMs = 10 * ONE_MINUTE_MS;
  const expiresAt = new Date(nowMs + tenMinutesMs).toISOString();

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.ok(result !== null, "should return a schedule, not null");
  assert.equal(result.showImmediately, false, "warning should not show immediately");
  assert.ok(result.msUntilWarn > 0, "msUntilWarn should be positive");
  // Warning fires exactly (expiry - WARN_BEFORE_MS) ms from now
  assert.equal(
    result.msUntilWarn,
    tenMinutesMs - FIVE_MINUTES_MS,
    "msUntilWarn should equal (msUntilExpiry - WARN_BEFORE_MS)",
  );
  assert.equal(result.msUntilExpiry, tenMinutesMs);
});

test("scheduleFromExpiry — warning fires ~5 min before expiry (initialSecondsLeft ≈ 300)", () => {
  const nowMs = 1_000_000_000_000;
  const expiresAt = new Date(nowMs + 60 * ONE_MINUTE_MS).toISOString(); // 1 hour

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.ok(result !== null);
  assert.equal(result.showImmediately, false);
  // initialSecondsLeft should be ~WARN_BEFORE_MS / 1000 = 300 s
  assert.equal(result.initialSecondsLeft, Math.round(WARN_BEFORE_MS / 1000));
});

// ─── scheduleFromExpiry — expiry < 5 min away ────────────────────────────────

test("scheduleFromExpiry — session expiring in <5 min shows warning immediately", () => {
  const nowMs = 1_000_000_000_000;
  const twoMinutesMs = 2 * ONE_MINUTE_MS;
  const expiresAt = new Date(nowMs + twoMinutesMs).toISOString();

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.ok(result !== null);
  assert.equal(result.showImmediately, true, "should show immediately inside warning window");
  assert.equal(result.msUntilWarn, 0);
  assert.equal(result.initialSecondsLeft, 120, "should show 120 s (2 min) remaining");
});

test("scheduleFromExpiry — exactly at warning boundary shows immediately with correct seconds", () => {
  const nowMs = 1_000_000_000_000;
  // Exactly WARN_BEFORE_MS remaining → msUntilWarn = 0 → show immediately
  const expiresAt = new Date(nowMs + FIVE_MINUTES_MS).toISOString();

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.ok(result !== null);
  assert.equal(result.showImmediately, true);
  assert.equal(result.initialSecondsLeft, Math.round(FIVE_MINUTES_MS / 1000)); // 300 s
});

test("scheduleFromExpiry — 30 s remaining shows 30 s in dialog", () => {
  const nowMs = 1_000_000_000_000;
  const expiresAt = new Date(nowMs + 30_000).toISOString();

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.ok(result !== null);
  assert.equal(result.showImmediately, true);
  assert.equal(result.initialSecondsLeft, 30);
});

// ─── scheduleFromExpiry — already expired ────────────────────────────────────

test("scheduleFromExpiry — already expired returns null (triggers forceLogout)", () => {
  const nowMs = 1_000_000_000_000;
  const expiresAt = new Date(nowMs - 1_000).toISOString(); // 1 s in the past

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.equal(result, null, "expired session should return null");
});

test("scheduleFromExpiry — expiry exactly at now returns null", () => {
  const nowMs = 1_000_000_000_000;
  const expiresAt = new Date(nowMs).toISOString();

  const result = computeSessionSchedule(expiresAt, nowMs);

  assert.equal(result, null);
});

// ─── Session extend — warningSecondsLeft recalculates from new expiresAt ─────

test("session extend — warningSecondsLeft resets to new expiry after extend", () => {
  const nowMs = 1_000_000_000_000;

  // Before extend: 2 min left — warning visible with 120 s
  const beforeExtend = computeSessionSchedule(
    new Date(nowMs + 2 * ONE_MINUTE_MS).toISOString(),
    nowMs,
  );
  assert.ok(beforeExtend?.showImmediately, "warning should be showing before extend");
  assert.equal(beforeExtend?.initialSecondsLeft, 120);

  // Server returns new expiresAt after extend (30 min)
  const afterExtend = computeSessionSchedule(
    new Date(nowMs + 30 * ONE_MINUTE_MS).toISOString(),
    nowMs,
  );
  assert.ok(afterExtend !== null, "extended session should have a valid schedule");
  assert.equal(afterExtend.showImmediately, false, "warning should no longer show immediately");
  assert.ok(afterExtend.msUntilWarn > 0, "new warning should be scheduled in the future");
  // 30 min - 5 min = 25 min until the warning fires again
  assert.equal(
    afterExtend.msUntilWarn,
    25 * ONE_MINUTE_MS,
    "warning should fire 25 min after extend",
  );
});

test("session extend — warningSecondsLeft for partial extension stays accurate", () => {
  const nowMs = 1_000_000_000_000;

  // Before extend: 1 min left
  const before = computeSessionSchedule(
    new Date(nowMs + ONE_MINUTE_MS).toISOString(),
    nowMs,
  );
  assert.ok(before?.showImmediately);
  assert.equal(before?.initialSecondsLeft, 60);

  // Extend to exactly WARN_BEFORE_MS + 1 min → shows immediately with 360s? No:
  // New expiry is 6 min away → outside warning window
  const after = computeSessionSchedule(
    new Date(nowMs + 6 * ONE_MINUTE_MS).toISOString(),
    nowMs,
  );
  assert.ok(after !== null);
  assert.equal(after.showImmediately, false);
  assert.equal(after.msUntilWarn, ONE_MINUTE_MS); // 1 min until warning fires again
});
