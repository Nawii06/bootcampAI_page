import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  assignmentSubmissions,
  budgetExecutions,
  companyCommitments,
  contentAttachments,
  performanceEvidence,
  students,
} from "@workspace/db/schema";
import type { AuthenticatedUser } from "@workspace/api-zod";
import { findCompanyForUser } from "../companies/repository";

export interface FileRelation {
  relationType: "ASSIGNMENT_SUBMISSION" | "BUDGET_EXECUTION" | "COMPANY_COMMITMENT" | "CONTENT_ATTACHMENT" | "PERFORMANCE_EVIDENCE";
  relationId: string;
  ownerStudentId?: string;
  ownerCompanyId?: string;
}

export async function getFileRelations(fileId: string): Promise<FileRelation[]> {
  const [submissions, executions, commitments, attachments, evidence] = await Promise.all([
    db.select({ id: assignmentSubmissions.id, studentId: assignmentSubmissions.studentId })
      .from(assignmentSubmissions).where(eq(assignmentSubmissions.fileId, fileId)),
    db.select({ id: budgetExecutions.id }).from(budgetExecutions)
      .where(eq(budgetExecutions.evidenceFileId, fileId)),
    db.select({ id: companyCommitments.id, companyId: companyCommitments.companyId })
      .from(companyCommitments).where(eq(companyCommitments.fileId, fileId)),
    db.select({ id: contentAttachments.id }).from(contentAttachments)
      .where(eq(contentAttachments.fileId, fileId)),
    db.select({ id: performanceEvidence.id }).from(performanceEvidence)
      .where(eq(performanceEvidence.fileId, fileId)),
  ]);
  return [
    ...submissions.map((row) => ({ relationType: "ASSIGNMENT_SUBMISSION" as const, relationId: row.id, ownerStudentId: row.studentId })),
    ...executions.map((row) => ({ relationType: "BUDGET_EXECUTION" as const, relationId: row.id })),
    ...commitments.map((row) => ({ relationType: "COMPANY_COMMITMENT" as const, relationId: row.id, ownerCompanyId: row.companyId })),
    ...attachments.map((row) => ({ relationType: "CONTENT_ATTACHMENT" as const, relationId: row.id })),
    ...evidence.map((row) => ({ relationType: "PERFORMANCE_EVIDENCE" as const, relationId: row.id })),
  ];
}

export async function canReadFile(
  user: AuthenticatedUser,
  uploadedBy: string,
  relations: FileRelation[],
) {
  if (user.id === uploadedBy || user.roles.includes("SYSTEM_ADMIN") || user.roles.includes("AUDITOR")) return true;
  if (relations.some((row) => row.relationType === "BUDGET_EXECUTION") && user.roles.some((role) => ["BUDGET_STAFF", "REVIEWER"].includes(role))) return true;
  if (relations.some((row) => row.relationType === "PERFORMANCE_EVIDENCE") && user.roles.some((role) => ["PERFORMANCE_STAFF", "REVIEWER"].includes(role))) return true;
  if (relations.some((row) => row.relationType === "CONTENT_ATTACHMENT") && user.roles.some((role) => ["CONTENT_EDITOR", "REVIEWER"].includes(role))) return true;
  if (relations.some((row) => row.relationType === "COMPANY_COMMITMENT") && user.roles.some((role) => ["COMPANY_STAFF", "REVIEWER"].includes(role))) return true;
  if (relations.some((row) => row.relationType === "ASSIGNMENT_SUBMISSION") && user.roles.some((role) => ["EDUCATION_STAFF", "REVIEWER"].includes(role))) return true;
  if (user.roles.includes("STUDENT")) {
    const student = await db.query.students.findFirst({ where: eq(students.userId, user.id) });
    if (student && relations.some((row) => row.ownerStudentId === student.id)) return true;
  }
  if (user.roles.includes("COMPANY_MANAGER")) {
    const company = await findCompanyForUser(user.id);
    if (company && relations.some((row) => row.ownerCompanyId === company.id)) return true;
  }
  return false;
}
