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
  DerivedCompletionCalculationRequestSchema,
  ExperientialRecordInputSchema,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { calculateCompletion } from "./calculator";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { loadCompletionCalculation } from "./repository";

type CalculationRequest = z.infer<typeof CompletionCalculationRequestSchema>;
type DerivedCalculationRequest = z.infer<
  typeof DerivedCompletionCalculationRequestSchema
>;

export function calculateAndStoreAssessment(
  input: CalculationRequest,
  actorId: string,
  requestId: string,
  eligiblePrograms: string[] = [],
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
        eligiblePrograms,
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
      eligiblePrograms,
      calculatedAt: assessment.calculatedAt.toISOString(),
    };
  });
}

export async function calculateAndStoreDerivedAssessment(
  input: DerivedCalculationRequest,
  actorId: string,
  requestId: string,
) {
  const calculation = await loadCompletionCalculation(input);
  return calculateAndStoreAssessment(
    {
      ...input,
      requirements: calculation.requirements,
      inputs: calculation.inputs,
    },
    actorId,
    requestId,
    calculation.eligiblePrograms,
  );
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

/** Look up a portfolio record by its public share token.
 *  Only returns records with publicConsent = true and no soft-delete. */
export function getExperientialRecordByToken(token: string) {
  return db
    .select({
      id: experientialRecords.id,
      title: experientialRecords.title,
      evidence: experientialRecords.evidence,
      createdAt: experientialRecords.createdAt,
    })
    .from(experientialRecords)
    .where(
      and(
        sql`${experientialRecords.evidence}->>'shareToken' = ${token}`,
        sql`${experientialRecords.evidence}->>'publicConsent' = 'true'`,
        isNull(experientialRecords.deletedAt),
      ),
    )
    .limit(1);
}

/** Returns the share token for a record, generating one if it doesn't exist yet.
 *  Enforces ownership (studentId) and publicConsent before issuing a token. */
export async function generateShareToken(
  recordId: string,
  studentId: string,
  actorId: string,
  requestId: string,
) {
  const [record] = await db
    .select({ id: experientialRecords.id, evidence: experientialRecords.evidence })
    .from(experientialRecords)
    .where(
      and(
        eq(experientialRecords.id, recordId),
        eq(experientialRecords.studentId, studentId),
        isNull(experientialRecords.deletedAt),
      ),
    )
    .limit(1);
  if (!record) {
    throw new ApiError(404, "EXPERIENTIAL_RECORD_NOT_FOUND", "포트폴리오를 찾을 수 없습니다.");
  }
  const evidence = record.evidence as Record<string, unknown>;
  if (!evidence.publicConsent) {
    throw new ApiError(
      422,
      "PUBLIC_CONSENT_REQUIRED",
      "공개 동의한 포트폴리오만 링크를 생성할 수 있습니다.",
    );
  }
  if (evidence.shareToken) {
    return { shareToken: evidence.shareToken as string };
  }
  const shareToken = randomBytes(24).toString("base64url");
  await db.transaction(async (tx) => {
    await tx
      .update(experientialRecords)
      .set({ evidence: { ...evidence, shareToken }, updatedAt: new Date() })
      .where(eq(experientialRecords.id, recordId));
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "GENERATE_SHARE_TOKEN",
      resourceType: "EXPERIENTIAL_RECORD",
      resourceId: recordId,
      requestId,
      metadata: { studentId },
    });
  });
  return { shareToken };
}

/** Clears the share token so the public URL immediately stops working.
 *  Enforces ownership (studentId). Idempotent when no token exists. */
export async function revokeShareToken(
  recordId: string,
  studentId: string,
  actorId: string,
  requestId: string,
) {
  const [record] = await db
    .select({ id: experientialRecords.id, evidence: experientialRecords.evidence })
    .from(experientialRecords)
    .where(
      and(
        eq(experientialRecords.id, recordId),
        eq(experientialRecords.studentId, studentId),
        isNull(experientialRecords.deletedAt),
      ),
    )
    .limit(1);
  if (!record) {
    throw new ApiError(404, "EXPERIENTIAL_RECORD_NOT_FOUND", "포트폴리오를 찾을 수 없습니다.");
  }
  const evidence = record.evidence as Record<string, unknown>;
  if (evidence.shareToken) {
    const { shareToken: _removed, ...rest } = evidence;
    await db.transaction(async (tx) => {
      await tx
        .update(experientialRecords)
        .set({ evidence: rest, updatedAt: new Date() })
        .where(eq(experientialRecords.id, recordId));
      await tx.insert(auditLogs).values({
        actorUserId: actorId,
        action: "REVOKE_SHARE_TOKEN",
        resourceType: "EXPERIENTIAL_RECORD",
        resourceId: recordId,
        requestId,
        metadata: { studentId },
      });
    });
  }
  return { revoked: true };
}

export function createExperientialRecord(
  input: ExperientialRecordInput,
  studentId: string,
  actorId: string,
  requestId: string,
) {
  // Pre-generate a share token so the student can copy a link immediately
  // after creating a consented portfolio entry.
  const shareToken = input.evidence.publicConsent
    ? randomBytes(24).toString("base64url")
    : undefined;
  const evidenceWithToken = shareToken
    ? { ...input.evidence, shareToken }
    : input.evidence;

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
        evidence: evidenceWithToken,
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
        hasShareToken: Boolean(shareToken),
      },
    });
    return record;
  });
}
