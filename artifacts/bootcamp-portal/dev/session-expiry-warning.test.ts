/**
 * Unit tests for SessionExpiryWarning countdown behaviour.
 *
 * The component manages a local countdown that:
 *   1. Initialises to `secondsRemaining` on mount.
 *   2. Resets to the new `secondsRemaining` whenever the prop changes.
 *   3. On each interval tick, computes the displayed value from a fixed
 *      `deadline` wall-clock timestamp rather than decrementing `c - 1`,
 *      so browser timer throttling (background-tab slowdown) does not
 *      cause the display to lag behind the real remaining time.
 *
 * We simulate the two useEffects using Node.js mock timers so the tests
 * run in microseconds rather than real wall-clock seconds.
 */
import assert from "node:assert/strict";
import { mock } from "node:test";
import test from "node:test";

// ─── Minimal simulation of the component's timer state machine ───────────────
//
// The component has two effects:
//   Effect A (dep: secondsRemaining): setCountdown(secondsRemaining)
//   Effect B (dep: secondsRemaining): captures deadline = getNow() + s*1000,
//                                     setInterval(() => countdown = round((deadline-getNow())/1000))
//                                     return () => clearInterval(id)
//
// We replicate this as a plain class so we can drive it with fake timers.
// An optional `getNow` parameter (default: Date.now) lets throttling tests
// control the wall clock independently of the setInterval mock.

class CountdownSimulator {
  private countdown: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private deadline: number;
  private getNow: () => number;

  constructor(secondsRemaining: number, getNow: () => number = () => Date.now()) {
    this.getNow = getNow;
    this.countdown = secondsRemaining;
    this.deadline = getNow() + secondsRemaining * 1000;
    this._startInterval(secondsRemaining);
  }

  /** Simulates the prop-sync effects: reset countdown and restart interval. */
  updateProp(secondsRemaining: number): void {
    this.countdown = secondsRemaining;
    this.deadline = this.getNow() + secondsRemaining * 1000;
    this._restartInterval(secondsRemaining);
  }

  get value(): number {
    return this.countdown;
  }

  dispose(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  private _restartInterval(secondsRemaining: number): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this._startInterval(secondsRemaining);
  }

  private _startInterval(secondsRemaining: number): void {
    if (secondsRemaining <= 0) return;
    const { deadline, getNow } = this;
    this.intervalId = setInterval(() => {
      const remaining = Math.round((deadline - getNow()) / 1000);
      this.countdown = Math.max(0, remaining);
      if (remaining <= 0 && this.intervalId !== null) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }, 1000);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("SessionExpiryWarning — initialises countdown from secondsRemaining prop", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  try {
    const sim = new CountdownSimulator(300);
    assert.equal(sim.value, 300);
    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — countdown decrements by 1 each second", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  try {
    const sim = new CountdownSimulator(300);

    mock.timers.tick(1000);
    assert.equal(sim.value, 299);

    mock.timers.tick(1000);
    assert.equal(sim.value, 298);

    mock.timers.tick(3000);
    assert.equal(sim.value, 295);

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — countdown stops at 0, does not go negative", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  try {
    const sim = new CountdownSimulator(3);

    mock.timers.tick(5000); // advance 5 s beyond the 3-s countdown
    assert.equal(sim.value, 0, "countdown should clamp at 0");

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — countdown restarts from new value when secondsRemaining prop changes", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  try {
    const sim = new CountdownSimulator(300);

    // Advance 10 s — countdown reaches 290
    mock.timers.tick(10_000);
    assert.equal(sim.value, 290);

    // Parent passes a new secondsRemaining (e.g. after session extend
    // gives a fresh expiresAt that is only 120 s away).
    // deadline resets to Date.now() + 120*1000 = 10_000 + 120_000 = 130_000
    sim.updateProp(120);

    // Immediately after prop change, countdown resets to 120
    assert.equal(sim.value, 120, "countdown should reset to new secondsRemaining");

    // Countdown now decrements from the NEW deadline
    mock.timers.tick(5000); // Date.now() → 15_000; remaining = (130_000-15_000)/1000 = 115
    assert.equal(sim.value, 115, "countdown should count down from the new value");

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — multiple prop updates each restart the countdown correctly", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  try {
    const sim = new CountdownSimulator(60);

    mock.timers.tick(10_000); // → 50
    assert.equal(sim.value, 50);

    // Session extend 1: 30 min new expiry, warning fires again with ~300 s
    sim.updateProp(300); // deadline = 10_000 + 300_000 = 310_000
    assert.equal(sim.value, 300);
    mock.timers.tick(2000); // Date.now() → 12_000; remaining = (310_000-12_000)/1000 = 298
    assert.equal(sim.value, 298);

    // Session extend 2: another extend
    sim.updateProp(300); // deadline = 12_000 + 300_000 = 312_000
    assert.equal(sim.value, 300);

    mock.timers.tick(1000); // Date.now() → 13_000; remaining = (312_000-13_000)/1000 = 299
    assert.equal(sim.value, 299);

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — prop change to 0 stops the countdown immediately", () => {
  mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  try {
    const sim = new CountdownSimulator(120);

    mock.timers.tick(5000); // → 115
    assert.equal(sim.value, 115);

    // Dialog is closed externally (parent sets secondsRemaining = 0)
    sim.updateProp(0);
    assert.equal(sim.value, 0);

    // No further decrement after reaching 0
    mock.timers.tick(5000);
    assert.equal(sim.value, 0);

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

// ─── Throttling accuracy test ─────────────────────────────────────────────────
//
// Browser background-tab throttling fires setInterval callbacks less
// frequently than every 1 s.  A counter-based approach (`c - 1`) would
// under-count: 3 s of wall time elapsed but only 2 callbacks fired → shows 8
// instead of the correct 7.  The deadline-anchored formula reads Date.now()
// inside each callback, so the displayed value is always correct regardless
// of how many callbacks were skipped.
//
// This test injects a fake clock (`getNow`) so the wall clock advances
// independently of the setInterval tick count, precisely simulating throttling.

test("SessionExpiryWarning — delayed tick (throttling) corrects countdown from wall clock", () => {
  let fakeNow = 0;
  const getNow = () => fakeNow;
  mock.timers.enable({ apis: ["setInterval"] }); // Date controlled via getNow, not mocked
  try {
    const sim = new CountdownSimulator(10, getNow);
    assert.equal(sim.value, 10, "starts at 10 s");

    // Regular tick: 1 s of wall time, one callback fires
    fakeNow = 1_000;
    mock.timers.tick(1_000);
    assert.equal(sim.value, 9, "1 s elapsed → 9 s remaining");

    // Throttled: 3 s of wall time has now elapsed, but only one callback
    // fires (the browser skipped the t=2000 callback).
    // counter-based (c-1) would show 8; deadline-anchored correctly shows 7.
    fakeNow = 3_000;
    mock.timers.tick(1_000);
    assert.equal(sim.value, 7, "3 s elapsed, one callback fired → 7 s remaining (not 8)");

    // Another delayed callback: 8 s total elapsed, one more callback
    fakeNow = 8_000;
    mock.timers.tick(1_000);
    assert.equal(sim.value, 2, "8 s elapsed → 2 s remaining");

    // Final callback: 10 s elapsed → 0 s, interval clears itself
    fakeNow = 10_000;
    mock.timers.tick(1_000);
    assert.equal(sim.value, 0, "10 s elapsed → 0 s, clamped");

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});
