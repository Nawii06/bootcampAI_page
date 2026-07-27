import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  assignmentSubmissions,
  assignments,
  attendanceEvents,
  attendanceRecords,
  auditLogs,
  programApplications,
  programCompletions,
  programSessions,
  programs,
  surveyResponses,
  surveys,
} from "@workspace/db/schema";
import type {
  AttendanceEventInputSchema,
  BulkAttendanceSchema,
  ConfirmProgramCompletionSchema,
} from "@workspace/api-zod";
import type { z } from "zod";
import { ApiError } from "../../lib/api-error";

type BulkAttendance = z.infer<typeof BulkAttendanceSchema>;
type CompletionCommand = z.infer<typeof ConfirmProgramCompletionSchema>;
type AttendanceEventInput = z.infer<typeof AttendanceEventInputSchema>;

export async function getProgramOperations(sessionId: string) {
  const [events, sessionAssignments, sessionSurveys, completions, applications] =
    await Promise.all([
      db.select().from(attendanceEvents)
        .where(eq(attendanceEvents.sessionId, sessionId))
        .orderBy(attendanceEvents.sequence),
      db.select().from(assignments).where(eq(assignments.sessionId, sessionId)),
      db.select().from(surveys).where(eq(surveys.sessionId, sessionId)),
      db.select().from(programCompletions)
        .where(eq(programCompletions.sessionId, sessionId)),
      db.select().from(programApplications)
        .where(and(
          eq(programApplications.sessionId, sessionId),
          inArray(programApplications.status, ["SELECTED", "WAITLISTED"]),
        )),
    ]);
  const [submissions, responses] = await Promise.all([
    sessionAssignments.length
      ? db.select().from(assignmentSubmissions).where(
          inArray(assignmentSubmissions.assignmentId, sessionAssignments.map((row) => row.id)),
        )
      : [],
    sessionSurveys.length
      ? db.select().from(surveyResponses).where(
          inArray(surveyResponses.surveyId, sessionSurveys.map((row) => row.id)),
        )
      : [],
  ]);
  return {
    attendanceEvents: events,
    assignments: sessionAssignments,
    surveys: sessionSurveys,
    completions,
    participants: applications,
    submissions,
    surveyResponses: responses,
  };
}

export function createAttendanceEvent(
  input: AttendanceEventInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [context] = await tx
      .select({ businessYearId: programs.businessYearId })
      .from(programSessions)
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(eq(programSessions.id, input.sessionId));
    if (!context) {
      throw new ApiError(404, "PROGRAM_SESSION_NOT_FOUND", "프로그램 회차를 찾을 수 없습니다.");
    }
    const [created] = await tx
      .insert(attendanceEvents)
      .values({
        ...input,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "ATTENDANCE_EVENT",
      resourceId: created?.id,
      businessYearId: context.businessYearId,
      requestId,
      after: input,
    });
    return created;
  });
}

export function recordBulkAttendance(
  input: BulkAttendance,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select({
        eventId: attendanceEvents.id,
        sessionId: programSessions.id,
        businessYearId: programs.businessYearId,
      })
      .from(attendanceEvents)
      .innerJoin(
        programSessions,
        eq(programSessions.id, attendanceEvents.sessionId),
      )
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(eq(attendanceEvents.id, input.eventId));
    if (!event) {
      throw new ApiError(404, "ATTENDANCE_EVENT_NOT_FOUND", "출석 회차를 찾을 수 없습니다.");
    }
    for (const record of input.records) {
      await tx
        .insert(attendanceRecords)
        .values({
          ...record,
          eventId: input.eventId,
          recordedBy: actorId,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.eventId, attendanceRecords.studentId],
          set: {
            status: record.status,
            minutesAttended: record.minutesAttended,
            note: record.note,
            recordedBy: actorId,
            recordedAt: new Date(),
          },
        });
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "BULK_UPSERT",
      resourceType: "ATTENDANCE_EVENT",
      resourceId: event.eventId,
      businessYearId: event.businessYearId,
      requestId,
      metadata: { affectedStudents: input.records.length },
    });
    return { affected: input.records.length };
  });
}

export function confirmProgramCompletion(
  input: CompletionCommand,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [context] = await tx
      .select({ session: programSessions, program: programs })
      .from(programSessions)
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(eq(programSessions.id, input.sessionId))
      .for("update");
    if (!context) {
      throw new ApiError(404, "PROGRAM_SESSION_NOT_FOUND", "프로그램 회차를 찾을 수 없습니다.");
    }
    const events = await tx
      .select({ id: attendanceEvents.id })
      .from(attendanceEvents)
      .where(eq(attendanceEvents.sessionId, input.sessionId));
    const records =
      events.length === 0
        ? []
        : await tx
            .select()
            .from(attendanceRecords)
            .where(
              and(
                inArray(
                  attendanceRecords.eventId,
                  events.map((event) => event.id),
                ),
                eq(attendanceRecords.studentId, input.studentId),
              ),
            );
    const attended = records.filter((record) =>
      ["PRESENT", "LATE", "EXCUSED"].includes(record.status),
    ).length;
    const attendanceRate =
      events.length === 0 ? 0 : (attended / events.length) * 100;

    const sessionAssignments = await tx
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.sessionId, input.sessionId));
    const submissions =
      sessionAssignments.length === 0
        ? []
        : await tx
            .select()
            .from(assignmentSubmissions)
            .where(
              and(
                inArray(
                  assignmentSubmissions.assignmentId,
                  sessionAssignments.map((assignment) => assignment.id),
                ),
                eq(assignmentSubmissions.studentId, input.studentId),
              ),
            );
    const scores = submissions
      .map((submission) => Number(submission.score))
      .filter(Number.isFinite);
    const assignmentScore =
      scores.length === 0
        ? 0
        : scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const sessionSurveys = await tx
      .select({ id: surveys.id })
      .from(surveys)
      .where(eq(surveys.sessionId, input.sessionId));
    const responses =
      sessionSurveys.length === 0
        ? []
        : await tx
            .select({ id: surveyResponses.id })
            .from(surveyResponses)
            .where(
              and(
                inArray(
                  surveyResponses.surveyId,
                  sessionSurveys.map((survey) => survey.id),
                ),
                eq(surveyResponses.studentId, input.studentId),
              ),
            );

    const rules = context.program.completionRules as {
      minimumAttendanceRate?: number;
      minimumAssignmentScore?: number;
      surveyRequired?: boolean;
    };
    const checks = {
      attendance:
        attendanceRate >= (Number(rules.minimumAttendanceRate) || 0),
      assignment:
        assignmentScore >= (Number(rules.minimumAssignmentScore) || 0),
      survey: !rules.surveyRequired || responses.length >= sessionSurveys.length,
    };
    const completed = Object.values(checks).every(Boolean);
    const snapshot = {
      rules,
      actual: {
        attendanceRate,
        assignmentScore,
        surveyResponses: responses.length,
        requiredSurveys: sessionSurveys.length,
      },
      checks,
    };
    const [completion] = await tx
      .insert(programCompletions)
      .values({
        sessionId: input.sessionId,
        studentId: input.studentId,
        completed,
        calculatedSnapshot: snapshot,
        confirmedBy: actorId,
      })
      .onConflictDoUpdate({
        target: [programCompletions.sessionId, programCompletions.studentId],
        set: {
          completed,
          calculatedSnapshot: snapshot,
          confirmedBy: actorId,
          confirmedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CONFIRM_COMPLETION",
      resourceType: "PROGRAM_COMPLETION",
      resourceId: completion?.id,
      businessYearId: context.program.businessYearId,
      requestId,
      metadata: { studentId: input.studentId, completed },
    });
    return completion;
  });
}
