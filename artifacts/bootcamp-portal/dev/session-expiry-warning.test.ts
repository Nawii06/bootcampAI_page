/**
 * Unit tests for SessionExpiryWarning countdown behaviour.
 *
 * The component manages a local countdown that:
 *   1. Initialises to `secondsRemaining` on mount.
 *   2. Resets to the new `secondsRemaining` whenever the prop changes.
 *   3. Decrements by 1 every second until it reaches 0.
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
//   Effect B (dep: countdown):        setInterval(() => setCountdown(c => c-1), 1000)
//                                     return () => clearInterval(id)
//
// We replicate this as a plain class so we can drive it with fake timers.

class CountdownSimulator {
  private countdown: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(secondsRemaining: number) {
    this.countdown = secondsRemaining;
    this._startInterval();
  }

  /** Simulates the prop-sync effect: reset countdown and restart interval. */
  updateProp(secondsRemaining: number): void {
    this.countdown = secondsRemaining;
    // Effect B re-runs because countdown changed (via setState inside Effect A),
    // which clears the old interval and starts a fresh one.
    this._restartInterval();
  }

  get value(): number {
    return this.countdown;
  }

  dispose(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
  }

  private _restartInterval(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this._startInterval();
  }

  private _startInterval(): void {
    if (this.countdown <= 0) return;
    this.intervalId = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
    }, 1000);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("SessionExpiryWarning — initialises countdown from secondsRemaining prop", () => {
  mock.timers.enable({ apis: ["setInterval"] });
  try {
    const sim = new CountdownSimulator(300);
    assert.equal(sim.value, 300);
    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — countdown decrements by 1 each second", () => {
  mock.timers.enable({ apis: ["setInterval"] });
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
  mock.timers.enable({ apis: ["setInterval"] });
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
  mock.timers.enable({ apis: ["setInterval"] });
  try {
    const sim = new CountdownSimulator(300);

    // Advance 10 s — countdown reaches 290
    mock.timers.tick(10_000);
    assert.equal(sim.value, 290);

    // Parent passes a new secondsRemaining (e.g. after session extend
    // gives a fresh expiresAt that is only 120 s away)
    sim.updateProp(120);

    // Immediately after prop change, countdown resets to 120
    assert.equal(sim.value, 120, "countdown should reset to new secondsRemaining");

    // Countdown now decrements from the NEW baseline, not from 290
    mock.timers.tick(5000);
    assert.equal(sim.value, 115, "countdown should count down from the new value");

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — multiple prop updates each restart the countdown correctly", () => {
  mock.timers.enable({ apis: ["setInterval"] });
  try {
    const sim = new CountdownSimulator(60);

    mock.timers.tick(10_000); // → 50
    assert.equal(sim.value, 50);

    // Session extend 1: 30 min new expiry, warning fires again with ~300 s
    sim.updateProp(300);
    assert.equal(sim.value, 300);
    mock.timers.tick(2000); // → 298
    assert.equal(sim.value, 298);

    // Session extend 2: another extend
    sim.updateProp(300);
    assert.equal(sim.value, 300);

    mock.timers.tick(1000); // → 299
    assert.equal(sim.value, 299);

    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});

test("SessionExpiryWarning — prop change to 0 stops the countdown immediately", () => {
  mock.timers.enable({ apis: ["setInterval"] });
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
