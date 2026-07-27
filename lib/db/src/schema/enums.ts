import { pgEnum } from "drizzle-orm/pg-core";

export const roleCodeEnum = pgEnum("role_code", [
  "PUBLIC",
  "STUDENT",
  "COMPANY_APPLICANT",
  "COMPANY_MANAGER",
  "EDUCATION_STAFF",
  "BENEFIT_STAFF",
  "COMPANY_STAFF",
  "BUDGET_STAFF",
  "PERFORMANCE_STAFF",
  "CONTENT_EDITOR",
  "REVIEWER",
  "SYSTEM_ADMIN",
  "AUDITOR",
]);

export const semesterEnum = pgEnum("semester_code", [
  "FIRST",
  "SUMMER",
  "SECOND",
  "WINTER",
]);

export const importStatusEnum = pgEnum("import_status", [
  "UPLOADED",
  "STAGED",
  "VALIDATED",
  "PREVIEWED",
  "COMMITTED",
  "FAILED",
  "CANCELLED",
]);

export const importRowStatusEnum = pgEnum("import_row_status", [
  "PENDING",
  "VALID",
  "INVALID",
  "INSERT",
  "UPDATE",
  "UNCHANGED",
  "COMMITTED",
]);

export const requirementTypeEnum = pgEnum("requirement_type", [
  "TOTAL_CREDITS",
  "REQUIRED_COURSE",
  "TRACK_CREDITS",
  "EXTRACURRICULAR_HOURS",
  "PROJECT",
  "FIELD_PRACTICE",
  "INTERNSHIP",
]);

export const comparisonOperatorEnum = pgEnum("comparison_operator", [
  "GTE",
  "LTE",
  "EQ",
  "IN",
]);

export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "DRAFT",
  "SUBMITTED",
  "OPEN",
  "CLOSED",
  "REVIEWING",
  "SUPPLEMENT_REQUESTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
  "ARCHIVED",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "DRAFT",
  "SUBMITTED",
  "REVIEWING",
  "SUPPLEMENT_REQUESTED",
  "SELECTED",
  "WAITLISTED",
  "REJECTED",
  "CANCELLED",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "REQUESTED",
  "PAID",
  "FAILED",
  "CANCELLED",
]);

export const publicationStatusEnum = pgEnum("publication_status", [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
]);
