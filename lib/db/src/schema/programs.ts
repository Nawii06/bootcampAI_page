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
  applicationStatusEnum,
  attendanceStatusEnum,
  lifecycleStatusEnum,
} from "./enums";
import { students, users } from "./identity";
import { storedFiles } from "./files";

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    termId: uuid("term_id").references(() => terms.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    trackCodeId: uuid("track_code_id").references(() => codeValues.id),
    levelCodeId: uuid("level_code_id").references(() => codeValues.id),
    programType: text("program_type").notNull(),
    eligibilityRules: jsonb("eligibility_rules")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    completionRules: jsonb("completion_rules")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: lifecycleStatusEnum("status").default("DRAFT").notNull(),
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
    uniqueIndex("program_year_code_uq").on(table.businessYearId, table.code),
    uniqueIndex("program_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
  ],
);

export const programSessions = pgTable(
  "program_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id),
    sequence: integer("sequence").notNull(),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull(),
    applicationStartsAt: timestamp("application_starts_at", {
      withTimezone: true,
    }).notNull(),
    applicationEndsAt: timestamp("application_ends_at", {
      withTimezone: true,
    }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    venue: text("venue"),
    status: lifecycleStatusEnum("status").default("DRAFT").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("program_session_sequence_uq").on(
      table.programId,
      table.sequence,
    ),
    index("program_session_period_idx").on(
      table.applicationStartsAt,
      table.applicationEndsAt,
    ),
  ],
);

export const programApplications = pgTable(
  "program_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => programSessions.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    status: applicationStatusEnum("status").default("DRAFT").notNull(),
    answers: jsonb("answers")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    eligibilitySnapshot: jsonb("eligibility_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("program_application_student_session_uq").on(
      table.sessionId,
      table.studentId,
    ),
    index("program_application_status_idx").on(table.sessionId, table.status),
  ],
);

export const attendanceEvents = pgTable(
  "attendance_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => programSessions.id),
    sequence: integer("sequence").notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("attendance_event_sequence_uq").on(
      table.sessionId,
      table.sequence,
    ),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => attendanceEvents.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    status: attendanceStatusEnum("status").notNull(),
    minutesAttended: integer("minutes_attended").default(0).notNull(),
    note: text("note"),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_record_student_event_uq").on(
      table.eventId,
      table.studentId,
    ),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => programSessions.id),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    maxScore: numeric("max_score", { precision: 7, scale: 2 }),
  },
  (table) => [index("assignment_session_idx").on(table.sessionId)],
);

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    fileId: uuid("file_id").references(() => storedFiles.id),
    content: text("content"),
    score: numeric("score", { precision: 7, scale: 2 }),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    gradedBy: uuid("graded_by").references(() => users.id),
  },
  (table) => [
    uniqueIndex("assignment_submission_student_uq").on(
      table.assignmentId,
      table.studentId,
    ),
  ],
);

export const surveys = pgTable("surveys", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => programSessions.id),
  title: text("title").notNull(),
  schema: jsonb("schema").$type<Record<string, unknown>>().notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
});

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id),
    studentId: uuid("student_id").references(() => students.id),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("survey_response_survey_idx").on(table.surveyId)],
);

export const programCompletions = pgTable(
  "program_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => programSessions.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    completed: boolean("completed").notNull(),
    calculatedSnapshot: jsonb("calculated_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    confirmedBy: uuid("confirmed_by")
      .notNull()
      .references(() => users.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("program_completion_student_session_uq").on(
      table.sessionId,
      table.studentId,
    ),
  ],
);
