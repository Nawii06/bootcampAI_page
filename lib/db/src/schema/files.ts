import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./identity";

export const fileRetentionPolicies = pgTable(
  "file_retention_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    retentionDays: integer("retention_days").notNull(),
    personalInfoRetentionDays: integer("personal_info_retention_days").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("file_retention_policy_active_idx").on(
      table.isActive,
      table.isDefault,
    ),
    uniqueIndex("file_retention_policy_one_default_idx")
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true and ${table.deletedAt} is null`),
  ],
);

export const storedFiles = pgTable(
  "stored_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    extension: text("extension").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    containsPersonalInfo: boolean("contains_personal_info")
      .default(false)
      .notNull(),
    retentionPolicyId: uuid("retention_policy_id").references(
      () => fileRetentionPolicies.id,
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    legalHoldUntil: timestamp("legal_hold_until", { withTimezone: true }),
    purgeRequestedAt: timestamp("purge_requested_at", { withTimezone: true }),
    purgedAt: timestamp("purged_at", { withTimezone: true }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("stored_file_hash_idx").on(table.sha256),
    index("stored_file_uploader_idx").on(table.uploadedBy),
    index("stored_file_retention_idx").on(table.expiresAt, table.deletedAt),
  ],
);
