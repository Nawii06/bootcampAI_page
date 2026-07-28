/**
 * Postgres-backed fixed-window rate-limit counters, shared across API
 * instances.
 *
 * The public portfolio endpoint previously tracked failed token guesses in an
 * in-process Map and used express-rate-limit's MemoryStore for the per-IP
 * ceiling. Both are per-process: counters reset on restart, and with multiple
 * replicas an attacker gets N separate guess budgets. Backing both counters
 * with the existing Postgres DB gives one shared budget regardless of how
 * many instances serve traffic.
 *
 * Counters use a single atomic upsert (INSERT ... ON CONFLICT) so concurrent
 * requests from different instances can't race a read-modify-write.
 */
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { Store, Options, IncrementResponse } from "express-rate-limit";

/**
 * Atomically increment the counter for `key`. If the current window has
 * expired (or the key is new), a fresh window of `windowMs` is started.
 * Returns the count within the current window and when it resets.
 */
export async function incrementCounter(
  key: string,
  windowMs: number,
): Promise<{ count: number; resetAt: Date }> {
  const result = await db.execute(sql`
    INSERT INTO rate_limit_counters ("key", "count", "reset_at")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN rate_limit_counters."reset_at" <= now() THEN 1
        ELSE rate_limit_counters."count" + 1
      END,
      "reset_at" = CASE
        WHEN rate_limit_counters."reset_at" <= now() THEN excluded."reset_at"
        ELSE rate_limit_counters."reset_at"
      END
    RETURNING "count", "reset_at"
  `);
  const row = result.rows[0] as { count: number; reset_at: string | Date };
  return { count: Number(row.count), resetAt: new Date(row.reset_at) };
}

/** Read the current count for `key` without incrementing (0 if expired). */
export async function getCounter(key: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT "count" FROM rate_limit_counters
    WHERE "key" = ${key} AND "reset_at" > now()
  `);
  const row = result.rows[0] as { count: number } | undefined;
  return row ? Number(row.count) : 0;
}

/** Delete expired counter rows so the table can't grow unbounded. */
export async function pruneExpiredCounters(): Promise<void> {
  await db.execute(
    sql`DELETE FROM rate_limit_counters WHERE "reset_at" <= now()`,
  );
}

/**
 * express-rate-limit Store backed by the shared Postgres counters, so the
 * per-IP ceiling is also enforced across instances (MemoryStore is
 * per-process).
 */
export class PostgresRateLimitStore implements Store {
  private windowMs = 60_000;

  readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const { count, resetAt } = await incrementCounter(
      `${this.prefix}${key}`,
      this.windowMs,
    );
    return { totalHits: count, resetTime: resetAt };
  }

  async decrement(key: string): Promise<void> {
    await db.execute(sql`
      UPDATE rate_limit_counters
      SET "count" = GREATEST("count" - 1, 0)
      WHERE "key" = ${`${this.prefix}${key}`}
    `);
  }

  async resetKey(key: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM rate_limit_counters
      WHERE "key" = ${`${this.prefix}${key}`}
    `);
  }
}
