import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { businessYears, codeValues, terms } from "./common";
import {
  comparisonOperatorEnum,
  requirementTypeEnum,
} from "./enums";

export const courseMasters = pgTable(
  "course_masters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseCode: text("course_code").notNull(),
    name: text("name").notNull(),
    englishName: text("english_name"),
    description: text("description"),
    defaultCredits: numeric("default_credits", {
      precision: 4,
      scale: 1,
    }).notNull(),
    departmentCode: text("department_code"),
    sourceSystem: text("source_system"),
    externalId: text("external_id"),
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
    uniqueIndex("course_master_code_uq").on(table.courseCode),
    uniqueIndex("course_master_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
  ],
);

export const courseOfferings = pgTable(
  "course_offerings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseMasterId: uuid("course_master_id")
      .notNull()
      .references(() => courseMasters.id),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id),
    sectionCode: text("section_code").default("01").notNull(),
    credits: numeric("credits", { precision: 4, scale: 1 }).notNull(),
    capacity: integer("capacity"),
    instructorName: text("instructor_name"),
    trackCodeId: uuid("track_code_id").references(() => codeValues.id),
    programLevelCodeId: uuid("program_level_code_id").references(
      () => codeValues.id,
    ),
    sourceSystem: text("source_system"),
    externalId: text("external_id"),
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
    uniqueIndex("course_offering_natural_uq").on(
      table.courseMasterId,
      table.termId,
      table.sectionCode,
    ),
    uniqueIndex("course_offering_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("course_offering_year_term_idx").on(
      table.businessYearId,
      table.termId,
    ),
  ],
);

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    version: integer("version").default(1).notNull(),
    trackCodeId: uuid("track_code_id").references(() => codeValues.id),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("curriculum_code_version_uq").on(table.code, table.version),
    index("curriculum_year_idx").on(table.businessYearId),
  ],
);

export const curriculumRequirements = pgTable(
  "curriculum_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    requirementType: requirementTypeEnum("requirement_type").notNull(),
    operator: comparisonOperatorEnum("operator").notNull(),
    requiredValue: numeric("required_value", { precision: 12, scale: 2 }),
    unit: text("unit"),
    courseMasterId: uuid("course_master_id").references(
      () => courseMasters.id,
    ),
    trackCodeId: uuid("track_code_id").references(() => codeValues.id),
    conditions: jsonb("conditions")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("curriculum_requirement_code_uq").on(
      table.curriculumId,
      table.code,
    ),
    index("curriculum_requirement_curriculum_idx").on(table.curriculumId),
  ],
);
