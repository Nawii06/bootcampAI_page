import { db } from "@workspace/db";
import {
  auditLogs,
  completionAssessments,
  curricula,
  experientialRecords,
  students,
} from "@workspace/db/schema";
import type { z } from "zod";
import {
  CompletionCalculationRequestSchema,
  ExperientialRecordInputSchema,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { calculateCompletion } from "./calculator";
import { and, desc, eq } from "drizzle-orm";

type CalculationRequest = z.infer<typeof CompletionCalculationRequestSchema>;

export function calculateAndStoreAssessment(
  input: CalculationRequest,
  actorId: string,
  requestId: string,
) {
  const result = calculateCompletion(input.requirements, input.inputs);

  return db.transaction(async (tx) => {
    const [assessment] = await tx
      .insert(completionAssessments)
      .values({
        businessYearId: input.businessYearId,
        studentId: input.studentId,
        curriculumId: input.curriculumId,
        programSessionId: input.programSessionId,
        calculationVersion: input.calculationVersion,
        completed: result.completed,
        progressRate: String(result.progressRate),
        satisfied: result.satisfied as unknown as Array<Record<string, unknown>>,
        missing: result.missing as unknown as Array<Record<string, unknown>>,
        eligiblePrograms: [],
        inputSnapshot: input.inputs as unknown as Record<string, unknown>,
        ruleSnapshot: {
          version: input.calculationVersion,
          requirements: input.requirements,
        },
      })
      .returning();
    if (!assessment) {
      throw new ApiError(500, "ASSESSMENT_CREATE_FAILED", "이수 평가를 저장하지 못했습니다.");
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CALCULATE",
      resourceType: "COMPLETION_ASSESSMENT",
      resourceId: assessment.id,
      businessYearId: input.businessYearId,
      requestId,
      metadata: {
        studentId: input.studentId,
        completed: result.completed,
        progressRate: result.progressRate,
      },
    });
    return {
      id: assessment.id,
      ...result,
      calculatedAt: assessment.calculatedAt.toISOString(),
    };
  });
}

export function listCompletionAssessments(
  studentId?: string,
  businessYearId?: string,
) {
  return db
    .select({
      id: completionAssessments.id,
      businessYearId: completionAssessments.businessYearId,
      studentId: completionAssessments.studentId,
      studentNumber: students.studentNumber,
      studentName: students.name,
      curriculumId: completionAssessments.curriculumId,
      curriculumName: curricula.name,
      programSessionId: completionAssessments.programSessionId,
      calculationVersion: completionAssessments.calculationVersion,
      completed: completionAssessments.completed,
      progressRate: completionAssessments.progressRate,
      satisfied: completionAssessments.satisfied,
      missing: completionAssessments.missing,
      eligiblePrograms: completionAssessments.eligiblePrograms,
      calculatedAt: completionAssessments.calculatedAt,
    })
    .from(completionAssessments)
    .innerJoin(students, eq(students.id, completionAssessments.studentId))
    .innerJoin(curricula, eq(curricula.id, completionAssessments.curriculumId))
    .where(
      and(
        studentId
          ? eq(completionAssessments.studentId, studentId)
          : undefined,
        businessYearId
          ? eq(completionAssessments.businessYearId, businessYearId)
          : undefined,
      ),
    )
    .orderBy(desc(completionAssessments.calculatedAt));
}

type ExperientialRecordInput = z.infer<typeof ExperientialRecordInputSchema>;

export function listExperientialRecords(filters: {
  studentId?: string;
  businessYearId?: string;
  type?: ExperientialRecordInput["type"];
}) {
  return db
    .select()
    .from(experientialRecords)
    .where(
      and(
        filters.studentId
          ? eq(experientialRecords.studentId, filters.studentId)
          : undefined,
        filters.businessYearId
          ? eq(experientialRecords.businessYearId, filters.businessYearId)
          : undefined,
        filters.type ? eq(experientialRecords.type, filters.type) : undefined,
      ),
    )
    .orderBy(desc(experientialRecords.createdAt));
}

export function createExperientialRecord(
  input: ExperientialRecordInput,
  studentId: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .insert(experientialRecords)
      .values({
        businessYearId: input.businessYearId,
        studentId,
        type: input.type,
        title: input.title,
        organizationName: input.organizationName,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        hours: input.hours === undefined ? undefined : String(input.hours),
        status: input.status,
        evidence: input.evidence,
      })
      .returning();
    if (!record) {
      throw new ApiError(500, "EXPERIENTIAL_RECORD_CREATE_FAILED", "포트폴리오 기록을 저장하지 못했습니다.");
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "EXPERIENTIAL_RECORD",
      resourceId: record.id,
      businessYearId: input.businessYearId,
      requestId,
      after: {
        studentId,
        type: input.type,
        title: input.title,
        status: input.status,
        publicConsent: input.evidence.publicConsent,
      },
    });
    return record;
  });
}
