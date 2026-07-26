import { db } from "@workspace/db";
import {
  auditLogs,
  programApplications,
  programSessions,
  programs,
} from "@workspace/db/schema";
import type {
  ProgramApplicationInput,
  ProgramWithSessionsInput,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import {
  countActiveApplications,
  findApplicationContext,
  listPrograms,
} from "./repository";
import { eq } from "drizzle-orm";

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

function evaluateEligibility(
  rules: Record<string, unknown>,
  student: { departmentCode: string; grade: string | null },
) {
  const departmentCodes = Array.isArray(rules.departmentCodes)
    ? rules.departmentCodes.filter((value): value is string => typeof value === "string")
    : undefined;
  const minimumGrade =
    typeof rules.minimumGrade === "number" ? rules.minimumGrade : undefined;
  const maximumGrade =
    typeof rules.maximumGrade === "number" ? rules.maximumGrade : undefined;
  const grade = Number(student.grade);
  const reasons: string[] = [];
  if (
    departmentCodes?.length &&
    !departmentCodes.includes(student.departmentCode)
  ) {
    reasons.push("신청 가능한 학과가 아닙니다.");
  }
  if (minimumGrade && (!Number.isFinite(grade) || grade < minimumGrade)) {
    reasons.push(`최소 ${minimumGrade}학년 이상이어야 합니다.`);
  }
  if (maximumGrade && (!Number.isFinite(grade) || grade > maximumGrade)) {
    reasons.push(`최대 ${maximumGrade}학년까지 신청할 수 있습니다.`);
  }
  return { eligible: reasons.length === 0, reasons };
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
    const eligibility = evaluateEligibility(
      context.program.eligibilityRules,
      context.student,
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
          },
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
