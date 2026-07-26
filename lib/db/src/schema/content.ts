import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { businessYears } from "./common";
import { publicationStatusEnum } from "./enums";
import { storedFiles } from "./files";
import { users } from "./identity";

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id").references(() => businessYears.id),
    contentType: text("content_type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: publicationStatusEnum("status").default("DRAFT").notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("content_type_slug_uq").on(table.contentType, table.slug),
    index("content_publication_idx").on(table.status, table.publishedAt),
  ],
);

export const contentAttachments = pgTable(
  "content_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => storedFiles.id),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("content_attachment_content_idx").on(table.contentId)],
);
