import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// Shared fixed-window counters for rate limiting. Stored in Postgres (rather
// than an in-process Map / express-rate-limit MemoryStore) so the counts are
// shared across API instances and survive restarts — an attacker facing N
// replicas gets one budget, not N.
export const rateLimitCounters = pgTable("rate_limit_counters", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
