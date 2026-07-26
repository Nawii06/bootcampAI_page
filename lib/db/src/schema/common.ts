import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { semesterEnum } from "./enums";

export const businessYears = pgTable(
  "business_years",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year").notNull(),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("business_year_year_uq").on(table.year)],
);

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    semester: semesterEnum("semester").notNull(),
    name: text("name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("term_year_semester_uq").on(
      table.businessYearId,
      table.semester,
    ),
  ],
);

export const codeGroups = pgTable(
  "code_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("code_group_code_uq").on(table.code)],
);

export const codeValues = pgTable(
  "code_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => codeGroups.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
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
    uniqueIndex("code_value_group_code_uq").on(table.groupId, table.code),
    index("code_value_group_idx").on(table.groupId),
  ],
);
