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
import { businessYears } from "./common";
import { lifecycleStatusEnum } from "./enums";
import { storedFiles } from "./files";
import { users } from "./identity";
import { programSessions } from "./programs";

export const companyApplications = pgTable(
  "company_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    applicantUserId: uuid("applicant_user_id")
      .notNull()
      .references(() => users.id),
    companyName: text("company_name").notNull(),
    registrationNumber: text("registration_number"),
    applicationData: jsonb("application_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: lifecycleStatusEnum("status").default("DRAFT").notNull(),
    supplementRequest: text("supplement_request"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("company_application_year_status_idx").on(
      table.businessYearId,
      table.status,
    ),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    approvedApplicationId: uuid("approved_application_id").references(
      () => companyApplications.id,
    ),
    name: text("name").notNull(),
    registrationNumber: text("registration_number"),
    companyType: text("company_type").notNull(),
    description: text("description"),
    website: text("website"),
    sourceSystem: text("source_system"),
    externalId: text("external_id"),
    isPublic: boolean("is_public").default(false).notNull(),
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
    uniqueIndex("company_registration_number_uq").on(table.registrationNumber),
    uniqueIndex("company_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
  ],
);

export const companyContacts = pgTable(
  "company_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    department: text("department"),
    position: text("position"),
    email: text("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("company_contact_company_idx").on(table.companyId)],
);

export const companyExperts = pgTable(
  "company_experts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    specialty: text("specialty").notNull(),
    profile: jsonb("profile").$type<Record<string, unknown>>().default({}),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [index("company_expert_company_idx").on(table.companyId)],
);

export const companyCommitments = pgTable(
  "company_commitments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => storedFiles.id),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("company_commitment_year_uq").on(
      table.companyId,
      table.businessYearId,
    ),
  ],
);

export const companyParticipations = pgTable(
  "company_participations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    programSessionId: uuid("program_session_id").references(
      () => programSessions.id,
    ),
    participationType: text("participation_type").notNull(),
    title: text("title").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    participantCount: integer("participant_count").default(0).notNull(),
    employmentCount: integer("employment_count").default(0).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("company_participation_company_year_idx").on(
      table.companyId,
      table.businessYearId,
    ),
  ],
);
