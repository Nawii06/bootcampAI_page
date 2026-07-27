import { db } from "@workspace/db";
import {
  auditLogs,
  completionAssessments,
  programApplications,
  programSessions,
  programs,
} from "@workspace/db/schema";
import type {
  ProgramApplicationInput,
  ProgramWithSessionsInput,
} from "@workspace/api-zod";
import { ProgramSessionInputSchema } from "@workspace/api-zod";
import type { z } from "zod";
import { ApiError } from "../../lib/api-error";
import {
  countActiveApplications,
  findApplicationContext,
  listPrograms,
} from "./repository";
import { and, desc, eq } from "drizzle-orm";
import { evaluateProgramEligibility } from "./eligibility";

type ProgramUpdate = Partial<Omit<ProgramWithSessionsInput, "sessions" | "businessYearId" | "code">>;
type SessionUpdate = Partial<z.infer<typeof ProgramSessionInputSchema>>;

export async function getPrograms(
  businessYearId?: string,
  status?: typeof programs.$inferSelect.status,
) {
  return listPrograms(businessYearId, status);
}

export function createProgram(
  input: ProgramWithSessionsInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const { sessions, ...programInput } = input;
    const [program] = await tx
      .insert(programs)
      .values({
        ...programInput,
        status: "DRAFT",
      })
      .returning();
    if (!program) {
      throw new ApiError(500, "PROGRAM_CREATE_FAILED", "프로그램을 생성하지 못했습니다.");
    }
    const createdSessions = await tx
      .insert(programSessions)
      .values(
        sessions.map((session) => ({
          ...session,
          programId: program.id,
          applicationStartsAt: new Date(session.applicationStartsAt),
          applicationEndsAt: new Date(session.applicationEndsAt),
          startsAt: new Date(session.startsAt),
          endsAt: new Date(session.endsAt),
          status: "DRAFT" as const,
        })),
      )
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "PROGRAM",
      resourceId: program.id,
      businessYearId: program.businessYearId,
      requestId,
      changedFields: Object.keys(input),
      after: input,
    });
    return { ...program, sessions: createdSessions };
  });
}

export function updateProgram(id: string, input: ProgramUpdate, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(programs).where(eq(programs.id, id)).for("update");
    if (!current) throw new ApiError(404, "PROGRAM_NOT_FOUND", "프로그램을 찾을 수 없습니다.");
    if (current.status !== "DRAFT") {
      throw new ApiError(409, "PROGRAM_NOT_EDITABLE", "초안 상태의 프로그램만 수정할 수 있습니다.");
    }
    const [updated] = await tx.update(programs).set({ ...input, updatedAt: new Date() })
      .where(eq(programs.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPDATE", resourceType: "PROGRAM",
      resourceId: id, businessYearId: current.businessYearId, requestId,
      before: current, after: updated, changedFields: Object.keys(input),
    });
    return updated;
  });
}

export function updateProgramSession(id: string, input: SessionUpdate, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(programSessions).where(eq(programSessions.id, id)).for("update");
    if (!current) throw new ApiError(404, "PROGRAM_SESSION_NOT_FOUND", "프로그램 회차를 찾을 수 없습니다.");
    if (current.status !== "DRAFT") {
      throw new ApiError(409, "PROGRAM_SESSION_NOT_EDITABLE", "초안 상태의 회차만 수정할 수 있습니다.");
    }
    const merged = ProgramSessionInputSchema.parse({
      sequence: input.sequence ?? current.sequence,
      name: input.name ?? current.name,
      capacity: input.capacity ?? current.capacity,
      applicationStartsAt: input.applicationStartsAt ?? current.applicationStartsAt.toISOString(),
      applicationEndsAt: input.applicationEndsAt ?? current.applicationEndsAt.toISOString(),
      startsAt: input.startsAt ?? current.startsAt.toISOString(),
      endsAt: input.endsAt ?? current.endsAt.toISOString(),
      venue: input.venue ?? current.venue ?? undefined,
    });
    const [updated] = await tx.update(programSessions).set({
      ...merged,
      applicationStartsAt: new Date(merged.applicationStartsAt),
      applicationEndsAt: new Date(merged.applicationEndsAt),
      startsAt: new Date(merged.startsAt),
      endsAt: new Date(merged.endsAt),
      updatedAt: new Date(),
    }).where(eq(programSessions.id, id)).returning();
    const [program] = await tx.select({ businessYearId: programs.businessYearId })
      .from(programs).where(eq(programs.id, current.programId));
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPDATE", resourceType: "PROGRAM_SESSION",
      resourceId: id, businessYearId: program?.businessYearId, requestId,
      before: current, after: updated, changedFields: Object.keys(input),
    });
    return updated;
  });
}

export function applyToProgram(
  input: ProgramApplicationInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const context = await findApplicationContext(
      tx,
      input.sessionId,
      input.studentId,
    );
    if (!context) {
      throw new ApiError(404, "PROGRAM_SESSION_NOT_FOUND", "프로그램 회차를 찾을 수 없습니다.");
    }
    if (context.session.status !== "OPEN") {
      throw new ApiError(409, "APPLICATION_NOT_OPEN", "신청 가능한 회차가 아닙니다.");
    }
    const now = new Date();
    if (
      now < context.session.applicationStartsAt ||
      now > context.session.applicationEndsAt
    ) {
      throw new ApiError(409, "APPLICATION_PERIOD_CLOSED", "신청기간이 아닙니다.");
    }
    const [latestAssessment] = await tx
      .select({
        id: completionAssessments.id,
        progressRate: completionAssessments.progressRate,
        inputSnapshot: completionAssessments.inputSnapshot,
      })
      .from(completionAssessments)
      .where(
        and(
          eq(completionAssessments.studentId, input.studentId),
          eq(
            completionAssessments.businessYearId,
            context.program.businessYearId,
          ),
        ),
      )
      .orderBy(desc(completionAssessments.calculatedAt))
      .limit(1);
    const assessmentInputs = latestAssessment?.inputSnapshot as
      | {
          totalCredits?: number;
          completedCourseIds?: string[];
        }
      | undefined;
    const eligibility = evaluateProgramEligibility(
      context.program.eligibilityRules,
      {
        ...context.student,
        progressRate: latestAssessment
          ? Number(latestAssessment.progressRate)
          : undefined,
        totalCredits: assessmentInputs?.totalCredits,
        completedCourseIds: assessmentInputs?.completedCourseIds,
      },
    );
    if (!eligibility.eligible) {
      throw new ApiError(422, "NOT_ELIGIBLE", eligibility.reasons.join(" "));
    }
    const activeCount = await countActiveApplications(tx, input.sessionId);
    if (activeCount >= context.session.capacity) {
      throw new ApiError(409, "CAPACITY_EXCEEDED", "프로그램 정원이 마감됐습니다.");
    }
    const [application] = await tx
      .insert(programApplications)
      .values({
        sessionId: input.sessionId,
        studentId: input.studentId,
        answers: input.answers,
        eligibilitySnapshot: {
          rules: context.program.eligibilityRules,
          student: {
            departmentCode: context.student.departmentCode,
            grade: context.student.grade,
            progressRate: latestAssessment
              ? Number(latestAssessment.progressRate)
              : null,
            totalCredits: assessmentInputs?.totalCredits ?? null,
            completedCourseIds: assessmentInputs?.completedCourseIds ?? [],
          },
          completionAssessmentId: latestAssessment?.id ?? null,
          result: eligibility,
          evaluatedAt: now.toISOString(),
        },
        status: "SUBMITTED",
        submittedAt: now,
      })
      .returning();
    if (!application) {
      throw new ApiError(500, "APPLICATION_CREATE_FAILED", "신청서를 생성하지 못했습니다.");
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "SUBMIT",
      resourceType: "PROGRAM_APPLICATION",
      resourceId: application.id,
      businessYearId: context.program.businessYearId,
      requestId,
      after: {
        sessionId: input.sessionId,
        studentId: input.studentId,
        status: application.status,
      },
    });
    return application;
  });
}

export function decideProgramApplication(
  input: {
    applicationId: string;
    status:
      | "REVIEWING"
      | "SUPPLEMENT_REQUESTED"
      | "SELECTED"
      | "WAITLISTED"
      | "REJECTED"
      | "CANCELLED";
    reviewNote?: string;
  },
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(programApplications)
      .where(eq(programApplications.id, input.applicationId))
      .for("update");
    if (!current) {
      throw new ApiError(404, "APPLICATION_NOT_FOUND", "프로그램 신청서를 찾을 수 없습니다.");
    }
    const [updated] = await tx
      .update(programApplications)
      .set({
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(programApplications.id, input.applicationId))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: `APPLICATION_${input.status}`,
      resourceType: "PROGRAM_APPLICATION",
      resourceId: input.applicationId,
      requestId,
      before: { status: current.status, reviewNote: current.reviewNote },
      after: { status: input.status, reviewNote: input.reviewNote },
    });
    return updated;
  });
}
