import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  assignmentSubmissions,
  assignments,
  auditLogs,
  programApplications,
  programSessions,
  programs,
  surveyResponses,
  surveys,
} from "@workspace/db/schema";
import { ApiError } from "../../lib/api-error";

async function requireSelectedStudent(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  sessionId: string,
  studentId: string,
) {
  const [application] = await tx
    .select({ id: programApplications.id })
    .from(programApplications)
    .where(
      and(
        eq(programApplications.sessionId, sessionId),
        eq(programApplications.studentId, studentId),
        eq(programApplications.status, "SELECTED"),
      ),
    );
  if (!application) {
    throw new ApiError(403, "PROGRAM_PARTICIPATION_REQUIRED", "선발된 프로그램 참여자만 제출할 수 있습니다.");
  }
}

export function createAssignment(
  input: {
    sessionId: string; title: string; description?: string;
    dueAt?: string; maxScore?: number;
  },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [context] = await tx.select({
      sessionId: programSessions.id,
      businessYearId: programs.businessYearId,
    }).from(programSessions)
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(eq(programSessions.id, input.sessionId));
    if (!context) throw new ApiError(404, "PROGRAM_SESSION_NOT_FOUND", "프로그램 회차를 찾을 수 없습니다.");
    const [assignment] = await tx.insert(assignments).values({
      sessionId: input.sessionId,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      maxScore: input.maxScore === undefined ? undefined : String(input.maxScore),
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "ASSIGNMENT",
      resourceId: assignment?.id, businessYearId: context.businessYearId,
      requestId, after: input,
    });
    return assignment;
  });
}

export function submitAssignment(
  input: { assignmentId: string; studentId: string; fileId?: string; content?: string },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [context] = await tx.select({
      assignment: assignments,
      businessYearId: programs.businessYearId,
    }).from(assignments)
      .innerJoin(programSessions, eq(programSessions.id, assignments.sessionId))
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(eq(assignments.id, input.assignmentId));
    if (!context) throw new ApiError(404, "ASSIGNMENT_NOT_FOUND", "과제를 찾을 수 없습니다.");
    if (context.assignment.dueAt && new Date() > context.assignment.dueAt) {
      throw new ApiError(409, "ASSIGNMENT_CLOSED", "과제 제출기한이 지났습니다.");
    }
    await requireSelectedStudent(tx, context.assignment.sessionId, input.studentId);
    const [submission] = await tx.insert(assignmentSubmissions).values({
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      fileId: input.fileId,
      content: input.content,
    }).onConflictDoUpdate({
      target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
      set: {
        fileId: input.fileId,
        content: input.content,
        submittedAt: new Date(),
        score: null,
        feedback: null,
        gradedAt: null,
        gradedBy: null,
      },
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "SUBMIT", resourceType: "ASSIGNMENT_SUBMISSION",
      resourceId: submission?.id, businessYearId: context.businessYearId,
      requestId, metadata: { assignmentId: input.assignmentId, studentId: input.studentId },
    });
    return submission;
  });
}

export function gradeSubmission(
  input: { submissionId: string; score: number; feedback?: string },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [context] = await tx.select({
      submission: assignmentSubmissions,
      maxScore: assignments.maxScore,
      businessYearId: programs.businessYearId,
    }).from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .innerJoin(programSessions, eq(programSessions.id, assignments.sessionId))
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(eq(assignmentSubmissions.id, input.submissionId)).for("update");
    if (!context) throw new ApiError(404, "SUBMISSION_NOT_FOUND", "과제 제출물을 찾을 수 없습니다.");
    if (context.maxScore !== null && input.score > Number(context.maxScore)) {
      throw new ApiError(422, "SCORE_EXCEEDS_MAXIMUM", "점수가 과제 만점을 초과합니다.");
    }
    const [submission] = await tx.update(assignmentSubmissions).set({
      score: String(input.score), feedback: input.feedback,
      gradedBy: actorId, gradedAt: new Date(),
    }).where(eq(assignmentSubmissions.id, input.submissionId)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "GRADE", resourceType: "ASSIGNMENT_SUBMISSION",
      resourceId: input.submissionId, businessYearId: context.businessYearId,
      requestId, before: { score: context.submission.score }, after: { score: input.score },
    });
    return submission;
  });
}

export function createSurvey(
  input: {
    sessionId: string; title: string; schema: Record<string, unknown>;
    isAnonymous: boolean; opensAt?: string; closesAt?: string;
  },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [survey] = await tx.insert(surveys).values({
      ...input,
      opensAt: input.opensAt ? new Date(input.opensAt) : undefined,
      closesAt: input.closesAt ? new Date(input.closesAt) : undefined,
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "SURVEY",
      resourceId: survey?.id, requestId, after: { sessionId: input.sessionId, title: input.title },
    });
    return survey;
  });
}

export function submitSurveyResponse(
  input: { surveyId: string; studentId?: string; answers: Record<string, unknown> },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [survey] = await tx.select().from(surveys)
      .where(eq(surveys.id, input.surveyId)).for("update");
    if (!survey) throw new ApiError(404, "SURVEY_NOT_FOUND", "설문을 찾을 수 없습니다.");
    const now = new Date();
    if ((survey.opensAt && now < survey.opensAt) || (survey.closesAt && now > survey.closesAt)) {
      throw new ApiError(409, "SURVEY_CLOSED", "설문 응답기간이 아닙니다.");
    }
    if (!survey.isAnonymous && !input.studentId) {
      throw new ApiError(422, "STUDENT_REQUIRED", "비익명 설문에는 학생 식별자가 필요합니다.");
    }
    if (input.studentId) await requireSelectedStudent(tx, survey.sessionId, input.studentId);
    const [response] = await tx.insert(surveyResponses).values({
      surveyId: input.surveyId,
      studentId: survey.isAnonymous ? undefined : input.studentId,
      answers: input.answers,
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "SUBMIT", resourceType: "SURVEY_RESPONSE",
      resourceId: response?.id, requestId,
      metadata: { surveyId: input.surveyId, anonymous: survey.isAnonymous },
    });
    return response;
  });
}
