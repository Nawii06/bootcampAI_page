import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { businessYears } from "./common";
import { storedFiles } from "./files";
import { users } from "./identity";
import { programs } from "./programs";

export const budgetAllocations = pgTable(
  "budget_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessYearId: uuid("business_year_id")
      .notNull()
      .references(() => businessYears.id),
    programId: uuid("program_id").references(() => programs.id),
    budgetCode: text("budget_code").notNull(),
    category: text("category").notNull(),
    allocatedAmount: numeric("allocated_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    plannedAmount: numeric("planned_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    internalApprovalNumber: text("internal_approval_number"),
    erpReference: text("erp_reference"),
    rcmsReference: text("rcms_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("budget_allocation_program_idx").on(
      table.businessYearId,
      table.programId,
    ),
  ],
);

export const budgetExecutions = pgTable(
  "budget_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    allocationId: uuid("allocation_id")
      .notNull()
      .references(() => budgetAllocations.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    purpose: text("purpose").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    evidenceFileId: uuid("evidence_file_id").references(() => storedFiles.id),
    internalApprovalNumber: text("internal_approval_number"),
    erpReference: text("erp_reference"),
    rcmsReference: text("rcms_reference"),
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
  (table) => [index("budget_execution_allocation_idx").on(table.allocationId)],
);

export const budgetChangeHistory = pgTable(
  "budget_change_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fieldName: text("field_name").notNull(),
    previousAmount: numeric("previous_amount", {
      precision: 15,
      scale: 2,
    }),
    newAmount: numeric("new_amount", { precision: 15, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    snapshot: jsonb("snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("budget_change_entity_idx").on(table.entityType, table.entityId),
  ],
);
