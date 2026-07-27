import {
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
import { paymentStatusEnum, lifecycleStatusEnum } from "./enums";
import { students, users } from "./identity";

export const benefitPolicies = pgTable(
  "benefit_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    benefitType: text("benefit_type").notNull(),
    amountFormula: jsonb("amount_formula")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: lifecycleStatusEnum("status").default("DRAFT").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("benefit_policy_year_code_uq").on(
      table.businessYearId,
      table.code,
    ),
  ],
);

export const benefitEligibilityRules = pgTable(
  "benefit_eligibility_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => benefitPolicies.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    expression: jsonb("expression")
      .$type<Record<string, unknown>>()
      .notNull(),
    sortOrder: numeric("sort_order", { precision: 5, scale: 0 }).notNull(),
  },
  (table) => [
    uniqueIndex("benefit_rule_policy_code_uq").on(table.policyId, table.code),
  ],
);

export const benefitCandidates = pgTable(
  "benefit_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => benefitPolicies.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    eligibilitySnapshot: jsonb("eligibility_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    calculatedAmount: numeric("calculated_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    status: lifecycleStatusEnum("status").default("REVIEWING").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("benefit_candidate_student_policy_uq").on(
      table.policyId,
      table.studentId,
    ),
  ],
);

export const benefitApprovals = pgTable(
  "benefit_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => benefitCandidates.id),
    approvedAmount: numeric("approved_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    decision: text("decision").notNull(),
    note: text("note"),
    snapshot: jsonb("snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    approvedBy: uuid("approved_by")
      .notNull()
      .references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("benefit_approval_candidate_idx").on(table.candidateId)],
);

export const benefitPayments = pgTable(
  "benefit_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    approvalId: uuid("approval_id")
      .notNull()
      .references(() => benefitApprovals.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    erpReference: text("erp_reference"),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("benefit_payment_approval_uq").on(table.approvalId)],
);
