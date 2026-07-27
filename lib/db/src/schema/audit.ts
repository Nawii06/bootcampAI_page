import {
  index,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    businessYearId: uuid("business_year_id"),
    requestId: text("request_id").notNull(),
    reason: text("reason"),
    changedFields: jsonb("changed_fields").$type<string[]>().default([]),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_actor_time_idx").on(table.actorUserId, table.occurredAt),
    index("audit_request_idx").on(table.requestId),
  ],
);
