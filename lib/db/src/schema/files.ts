import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

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
  ],
);
