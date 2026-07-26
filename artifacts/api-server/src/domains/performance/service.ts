import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  performanceIndicators,
  performanceReviews,
  performanceResults,
  performanceTargets,
  students,
  companies,
  programs,
  companyParticipations,
  experientialRecords,
  courseCompletions,
  programApplications,
} from "@workspace/db/schema";
import { ApiError } from "../../lib/api-error";

export function createIndicator(
  input: typeof performanceIndicators.$inferInsert,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [indicator] = await tx.insert(performanceIndicators).values(input).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "PERFORMANCE_INDICATOR",
      resourceId: indicator?.id, requestId, after: input,
    });
    return indicator;
  });
}

export function createTarget(
  input: { indicatorId: string; businessYearId: string; targetValue: number; version: string; rationale?: string },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [target] = await tx.insert(performanceTargets).values({
      ...input, targetValue: String(input.targetValue), approvedBy: actorId, approvedAt: new Date(),
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "PERFORMANCE_TARGET",
      resourceId: target?.id, businessYearId: input.businessYearId, requestId, after: input,
    });
    return target;
  });
}

export function upsertResult(
  input: { indicatorId: string; businessYearId: string; actualValue: number; calculationSnapshot: Record<string, unknown> },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [result] = await tx.insert(performanceResults).values({
      ...input, actualValue: String(input.actualValue), status: "DRAFT",
    }).onConflictDoUpdate({
      target: [performanceResults.indicatorId, performanceResults.businessYearId],
      set: {
        actualValue: String(input.actualValue),
        calculationSnapshot: input.calculationSnapshot,
        status: "DRAFT",
        publicApprovedBy: null,
        publicApprovedAt: null,
        updatedAt: new Date(),
      },
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPSERT", resourceType: "PERFORMANCE_RESULT",
      resourceId: result?.id, businessYearId: input.businessYearId, requestId,
      metadata: { actualValue: input.actualValue },
    });
    return result;
  });
}

export function approvePublicResult(id: string, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(performanceResults)
      .where(eq(performanceResults.id, id)).for("update");
    if (!current) throw new ApiError(404, "PERFORMANCE_RESULT_NOT_FOUND", "성과 실적을 찾을 수 없습니다.");
    const [result] = await tx.update(performanceResults).set({
      status: "PUBLISHED", publicApprovedBy: actorId, publicApprovedAt: new Date(), updatedAt: new Date(),
    }).where(eq(performanceResults.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "APPROVE_PUBLICATION", resourceType: "PERFORMANCE_RESULT",
      resourceId: id, businessYearId: current.businessYearId, requestId,
      before: { status: current.status }, after: { status: "PUBLISHED" },
    });
    return result;
  });
}

export function listPublicResults(businessYearId?: string) {
  return db.select({
    id: performanceResults.id,
    actualValue: performanceResults.actualValue,
    calculationSnapshot: performanceResults.calculationSnapshot,
    publishedAt: performanceResults.publicApprovedAt,
    indicatorCode: performanceIndicators.code,
    indicatorName: performanceIndicators.name,
    unit: performanceIndicators.unit,
  }).from(performanceResults)
    .innerJoin(performanceIndicators, eq(performanceIndicators.id, performanceResults.indicatorId))
    .where(and(
      eq(performanceResults.status, "PUBLISHED"),
      businessYearId ? eq(performanceResults.businessYearId, businessYearId) : undefined,
    )).orderBy(desc(performanceResults.publicApprovedAt));
}

export async function getPerformanceOverview(businessYearId: string) {
  const [indicators, targets, results] = await Promise.all([
    db
      .select()
      .from(performanceIndicators)
      .where(
        and(
          eq(performanceIndicators.isActive, true),
          isNull(performanceIndicators.deletedAt),
        ),
      )
      .orderBy(asc(performanceIndicators.category), asc(performanceIndicators.name)),
    db
      .select()
      .from(performanceTargets)
      .where(eq(performanceTargets.businessYearId, businessYearId))
      .orderBy(desc(performanceTargets.approvedAt)),
    db
      .select()
      .from(performanceResults)
      .where(eq(performanceResults.businessYearId, businessYearId)),
  ]);
  return { indicators, targets, results };
}

export function listPerformanceReviews(businessYearId: string) {
  return db
    .select()
    .from(performanceReviews)
    .where(
      and(
        eq(performanceReviews.businessYearId, businessYearId),
        isNull(performanceReviews.deletedAt),
      ),
    )
    .orderBy(desc(performanceReviews.createdAt));
}

export function createPerformanceReview(
  input: {
    businessYearId: string;
    question: string;
    answerSummary: string;
    limitations?: string;
    improvementPlan: string;
    linkedIndicatorIds: string[];
    linkedEvidenceIds: string[];
  },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [review] = await tx
      .insert(performanceReviews)
      .values({ ...input, createdBy: actorId })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "PERFORMANCE_REVIEW",
      resourceId: review?.id,
      businessYearId: input.businessYearId,
      requestId,
      after: {
        question: input.question,
        linkedIndicatorIds: input.linkedIndicatorIds,
        linkedEvidenceIds: input.linkedEvidenceIds,
      },
    });
    return review;
  });
}

export async function getPerformanceSourceSummary(businessYearId: string) {
  const [
    studentCount,
    companyCount,
    programCount,
    participationCount,
    experienceCount,
    courseCompletionCount,
    applicationCount,
  ] = await Promise.all([
    db.$count(students, isNull(students.deletedAt)),
    db.$count(companies, isNull(companies.deletedAt)),
    db.$count(
      programs,
      and(
        eq(programs.businessYearId, businessYearId),
        isNull(programs.deletedAt),
      ),
    ),
    db.$count(
      companyParticipations,
      and(
        eq(companyParticipations.businessYearId, businessYearId),
        isNull(companyParticipations.deletedAt),
      ),
    ),
    db.$count(
      experientialRecords,
      and(
        eq(experientialRecords.businessYearId, businessYearId),
        isNull(experientialRecords.deletedAt),
      ),
    ),
    db.$count(courseCompletions),
    db.$count(programApplications, isNull(programApplications.deletedAt)),
  ]);
  return {
    data: [
      { id: "students", domain: "학생 마스터", table: "students", count: studentCount, yearScoped: false },
      { id: "companies", domain: "참여기업", table: "companies", count: companyCount, yearScoped: false },
      { id: "programs", domain: "비교과 프로그램", table: "programs", count: programCount, yearScoped: true },
      { id: "companyParticipations", domain: "기업 참여활동", table: "company_participations", count: participationCount, yearScoped: true },
      { id: "experientialRecords", domain: "학생 경험기록", table: "experiential_records", count: experienceCount, yearScoped: true },
      { id: "courseCompletions", domain: "교과목 이수", table: "course_completions", count: courseCompletionCount, yearScoped: false },
      { id: "programApplications", domain: "프로그램 신청", table: "program_applications", count: applicationCount, yearScoped: false },
    ],
  };
}
