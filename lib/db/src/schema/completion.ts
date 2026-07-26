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
import { courseOfferings, curricula } from "./academic";
import { businessYears } from "./common";
import { students } from "./identity";
import { programSessions } from "./programs";

export const courseCompletions = pgTable(
  "course_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    courseOfferingId: uuid("course_offering_id")
      .notNull()
      .references(() => courseOfferings.id),
    grade: text("grade"),
    creditsEarned: numeric("credits_earned", {
      precision: 4,
      scale: 1,
    }).notNull(),
    passed: boolean("passed").notNull(),
    sourceSystem: text("source_system"),
    externalId: text("external_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("course_completion_student_offering_uq").on(
      table.studentId,
      table.courseOfferingId,
    ),
    uniqueIndex("course_completion_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
  ],
);

export const experientialRecords = pgTable(
  "experiential_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    organizationName: text("organization_name"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    hours: numeric("hours", { precision: 8, scale: 1 }),
    status: text("status").notNull(),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}),
    sourceSystem: text("source_system"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("experiential_record_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
    index("experiential_record_student_idx").on(
      table.studentId,
      table.businessYearId,
    ),
  ],
);

export const completionAssessments = pgTable(
  "completion_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id),
    programSessionId: uuid("program_session_id").references(
      () => programSessions.id,
    ),
    calculationVersion: text("calculation_version").notNull(),
    completed: boolean("completed").notNull(),
    progressRate: numeric("progress_rate", {
      precision: 5,
      scale: 2,
    }).notNull(),
    satisfied: jsonb("satisfied")
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    missing: jsonb("missing")
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    eligiblePrograms: jsonb("eligible_programs")
      .$type<string[]>()
      .default([]),
    inputSnapshot: jsonb("input_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    ruleSnapshot: jsonb("rule_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("completion_assessment_student_time_idx").on(
      table.studentId,
      table.calculatedAt,
    ),
  ],
);
