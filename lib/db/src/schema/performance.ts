import {
  boolean,
  index,
  jsonb,
  numeric,
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

export const performanceIndicators = pgTable(
  "performance_indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull(),
    calculationFormula: jsonb("calculation_formula")
      .$type<Record<string, unknown>>()
      .notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("performance_indicator_code_uq").on(table.code)],
);

export const performanceTargets = pgTable(
  "performance_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => performanceIndicators.id),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    targetValue: numeric("target_value", {
      precision: 15,
      scale: 2,
    }).notNull(),
    version: text("version").notNull(),
    rationale: text("rationale"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("performance_target_version_uq").on(
      table.indicatorId,
      table.businessYearId,
      table.version,
    ),
  ],
);

export const performanceResults = pgTable(
  "performance_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => performanceIndicators.id),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    actualValue: numeric("actual_value", {
      precision: 15,
      scale: 2,
    }).notNull(),
    calculationSnapshot: jsonb("calculation_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: publicationStatusEnum("status").default("DRAFT").notNull(),
    publicApprovedBy: uuid("public_approved_by").references(() => users.id),
    publicApprovedAt: timestamp("public_approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("performance_result_year_indicator_uq").on(
      table.indicatorId,
      table.businessYearId,
    ),
  ],
);

export const performanceEvidence = pgTable(
  "performance_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => performanceResults.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => storedFiles.id),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("performance_evidence_result_idx").on(table.resultId)],
);

export const performanceReviews = pgTable(
  "performance_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    question: text("question").notNull(),
    answerSummary: text("answer_summary").notNull(),
    limitations: text("limitations"),
    improvementPlan: text("improvement_plan").notNull(),
    linkedIndicatorIds: uuid("linked_indicator_ids").array().default([]).notNull(),
    linkedEvidenceIds: uuid("linked_evidence_ids").array().default([]).notNull(),
    status: publicationStatusEnum("status").default("DRAFT").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("performance_review_year_idx").on(
      table.businessYearId,
      table.createdAt,
    ),
  ],
);
