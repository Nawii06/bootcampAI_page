import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  programApplications,
  programSessions,
  programs,
  students,
} from "@workspace/db/schema";

export function listPrograms(
  businessYearId?: string,
  status?: typeof programs.$inferSelect.status,
) {
  return db.query.programs.findMany({
    where: and(
      isNull(programs.deletedAt),
      businessYearId
        ? eq(programs.businessYearId, businessYearId)
        : undefined,
      status ? eq(programs.status, status) : undefined,
    ),
    with: {
      programSessions: true,
    },
    orderBy: [asc(programs.name)],
  });
}

export async function findApplicationContext(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  sessionId: string,
  studentId: string,
) {
  const [context] = await transaction
    .select({ session: programSessions, program: programs, student: students })
    .from(programSessions)
    .innerJoin(programs, eq(programs.id, programSessions.programId))
    .innerJoin(students, eq(students.id, studentId))
    .where(
      and(
        eq(programSessions.id, sessionId),
        isNull(programSessions.deletedAt),
        isNull(programs.deletedAt),
        isNull(students.deletedAt),
      ),
    )
    .for("update");
  return context;
}

export function countActiveApplications(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  sessionId: string,
) {
  return transaction.$count(
    programApplications,
    and(
      eq(programApplications.sessionId, sessionId),
      inArray(programApplications.status, [
        "SUBMITTED",
        "REVIEWING",
        "SELECTED",
        "WAITLISTED",
      ]),
      isNull(programApplications.deletedAt),
    ),
  );
}

export function listApplications(filters: {
  studentId?: string;
  sessionId?: string;
  status?: typeof programApplications.$inferSelect.status;
}) {
  return db
    .select({
      id: programApplications.id,
      sessionId: programApplications.sessionId,
      studentId: programApplications.studentId,
      status: programApplications.status,
      answers: programApplications.answers,
      reviewNote: programApplications.reviewNote,
      submittedAt: programApplications.submittedAt,
      updatedAt: programApplications.updatedAt,
      programName: programs.name,
      sessionName: programSessions.name,
    })
    .from(programApplications)
    .innerJoin(
      programSessions,
      eq(programSessions.id, programApplications.sessionId),
    )
    .innerJoin(programs, eq(programs.id, programSessions.programId))
    .where(
      and(
        filters.studentId
          ? eq(programApplications.studentId, filters.studentId)
          : undefined,
        filters.sessionId
          ? eq(programApplications.sessionId, filters.sessionId)
          : undefined,
        filters.status
          ? eq(programApplications.status, filters.status)
          : undefined,
        isNull(programApplications.deletedAt),
      ),
    )
    .orderBy(asc(programApplications.submittedAt));
}
