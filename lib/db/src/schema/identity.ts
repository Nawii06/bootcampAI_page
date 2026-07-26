import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { roleCodeEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loginId: text("login_id").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    sourceSystem: text("source_system"),
    externalId: text("external_id"),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_login_id_uq").on(table.loginId),
    uniqueIndex("user_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
  ],
);

export const roles = pgTable("roles", {
  code: roleCodeEnum("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleCode: roleCodeEnum("role_code")
      .notNull()
      .references(() => roles.code),
    scopeType: text("scope_type").default("GLOBAL").notNull(),
    scopeId: uuid("scope_id"),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    grantedBy: uuid("granted_by").references(() => users.id),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.roleCode, table.scopeType],
      name: "user_role_pk",
    }),
    index("user_role_user_idx").on(table.userId),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    studentNumber: text("student_number").notNull(),
    name: text("name").notNull(),
    departmentCode: text("department_code").notNull(),
    grade: text("grade"),
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
    uniqueIndex("student_number_uq").on(table.studentNumber),
    uniqueIndex("student_user_uq").on(table.userId),
    uniqueIndex("student_external_key_uq").on(
      table.sourceSystem,
      table.externalId,
    ),
  ],
);
