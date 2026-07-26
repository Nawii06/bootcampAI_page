import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { businessYears, terms } from "./common";
import { importRowStatusEnum, importStatusEnum } from "./enums";
import { users } from "./identity";

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    termId: uuid("term_id").references(() => terms.id),
    entityType: text("entity_type").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceType: text("source_type").notNull(),
    fileName: text("file_name"),
    fileHash: text("file_hash"),
    status: importStatusEnum("status").default("UPLOADED").notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    validRows: integer("valid_rows").default(0).notNull(),
    invalidRows: integer("invalid_rows").default(0).notNull(),
    insertRows: integer("insert_rows").default(0).notNull(),
    updateRows: integer("update_rows").default(0).notNull(),
    unchangedRows: integer("unchanged_rows").default(0).notNull(),
    options: jsonb("options").$type<Record<string, unknown>>().default({}),
    errorSummary: jsonb("error_summary")
      .$type<Record<string, unknown>>()
      .default({}),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    committedBy: uuid("committed_by").references(() => users.id),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("import_job_source_hash_uq").on(
      table.sourceSystem,
      table.entityType,
      table.fileHash,
    ),
    index("import_job_status_idx").on(table.status),
    index("import_job_year_term_idx").on(
      table.businessYearId,
      table.termId,
    ),
  ],
);

export const importStagingRows = pgTable(
  "import_staging_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    sourceSystem: text("source_system").notNull(),
    externalId: text("external_id"),
    rawData: jsonb("raw_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    normalizedData: jsonb("normalized_data")
      .$type<Record<string, unknown>>()
      .default({}),
    status: importRowStatusEnum("status").default("PENDING").notNull(),
    validationErrors: jsonb("validation_errors")
      .$type<Array<{ field?: string; code: string; message: string }>>()
      .default([]),
    previewDiff: jsonb("preview_diff")
      .$type<Record<string, unknown>>()
      .default({}),
    targetId: uuid("target_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("import_staging_job_row_uq").on(
      table.importJobId,
      table.rowNumber,
    ),
    index("import_staging_job_status_idx").on(
      table.importJobId,
      table.status,
    ),
  ],
);
