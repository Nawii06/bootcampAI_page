import { db } from "@workspace/db";
import {
  codeValues,
  courseCompletions,
  courseMasters,
  courseOfferings,
  curricula,
  curriculumRequirements,
  experientialRecords,
  programApplications,
  programCompletions,
  programs,
  programSessions,
  students,
} from "@workspace/db/schema";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { ApiError } from "../../lib/api-error";
import { buildCompletionCalculation } from "./derivation";
import { calculateCompletion } from "./calculator";
import { selectEligibleProgramIds } from "../programs/eligibility";

export async function loadCompletionCalculation(input: {
  businessYearId: string;
  studentId: string;
  curriculumId: string;
}) {
  const [student, curriculum] = await Promise.all([
    db.query.students.findFirst({
      where: and(
        eq(students.id, input.studentId),
        eq(students.isActive, true),
        isNull(students.deletedAt),
      ),
    }),
    db.query.curricula.findFirst({
      where: and(
        eq(curricula.id, input.curriculumId),
        eq(curricula.businessYearId, input.businessYearId),
        isNull(curricula.deletedAt),
      ),
    }),
  ]);
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "학생 정보를 찾을 수 없습니다.");
  }
  if (!curriculum) {
    throw new ApiError(
      404,
      "CURRICULUM_NOT_FOUND",
      "해당 사업연도의 교육과정을 찾을 수 없습니다.",
    );
  }

  const [requirements, courses, completedPrograms, experiences] =
    await Promise.all([
      db
        .select({
          id: curriculumRequirements.id,
          name: curriculumRequirements.name,
          requirementType: curriculumRequirements.requirementType,
          operator: curriculumRequirements.operator,
          requiredValue: curriculumRequirements.requiredValue,
          courseMasterId: curriculumRequirements.courseMasterId,
          trackCode: codeValues.code,
        })
        .from(curriculumRequirements)
        .leftJoin(codeValues, eq(codeValues.id, curriculumRequirements.trackCodeId))
        .where(
          and(
            eq(curriculumRequirements.curriculumId, input.curriculumId),
            eq(curriculumRequirements.isRequired, true),
            isNull(curriculumRequirements.deletedAt),
          ),
        ),
      db
        .select({
          courseMasterId: courseMasters.id,
          creditsEarned: courseCompletions.creditsEarned,
          trackCode: codeValues.code,
        })
        .from(courseCompletions)
        .innerJoin(
          courseOfferings,
          eq(courseOfferings.id, courseCompletions.courseOfferingId),
        )
        .innerJoin(
          courseMasters,
          eq(courseMasters.id, courseOfferings.courseMasterId),
        )
        .leftJoin(codeValues, eq(codeValues.id, courseOfferings.trackCodeId))
        .where(
          and(
            eq(courseCompletions.studentId, input.studentId),
            eq(courseCompletions.passed, true),
            eq(courseOfferings.businessYearId, input.businessYearId),
          ),
        ),
      db
        .select({
          startsAt: programSessions.startsAt,
          endsAt: programSessions.endsAt,
        })
        .from(programCompletions)
        .innerJoin(
          programSessions,
          eq(programSessions.id, programCompletions.sessionId),
        )
        .innerJoin(programs, eq(programs.id, programSessions.programId))
        .where(
          and(
            eq(programCompletions.studentId, input.studentId),
            eq(programCompletions.completed, true),
            eq(programs.businessYearId, input.businessYearId),
          ),
        ),
      db
        .select({
          type: experientialRecords.type,
          hours: experientialRecords.hours,
        })
        .from(experientialRecords)
        .where(
          and(
            eq(experientialRecords.studentId, input.studentId),
            eq(experientialRecords.businessYearId, input.businessYearId),
            inArray(experientialRecords.status, ["VERIFIED", "COMPLETED"]),
            isNull(experientialRecords.deletedAt),
          ),
        ),
    ]);

  const calculation = buildCompletionCalculation({
    requirements,
    courses,
    completedPrograms,
    experiences,
  });
  const assessment = calculateCompletion(
    calculation.requirements,
    calculation.inputs,
  );
  const now = new Date();
  const candidates = await db
    .select({
      programId: programs.id,
      sessionId: programSessions.id,
      capacity: programSessions.capacity,
      eligibilityRules: programs.eligibilityRules,
    })
    .from(programSessions)
    .innerJoin(programs, eq(programs.id, programSessions.programId))
    .where(
      and(
        eq(programs.businessYearId, input.businessYearId),
        eq(programSessions.status, "OPEN"),
        lte(programSessions.applicationStartsAt, now),
        gte(programSessions.applicationEndsAt, now),
        isNull(programSessions.deletedAt),
        isNull(programs.deletedAt),
      ),
    );
  const sessionIds = candidates.map((candidate) => candidate.sessionId);
  const applications = sessionIds.length
    ? await db
        .select({
          sessionId: programApplications.sessionId,
          studentId: programApplications.studentId,
          status: programApplications.status,
        })
        .from(programApplications)
        .where(
          and(
            inArray(programApplications.sessionId, sessionIds),
            isNull(programApplications.deletedAt),
          ),
        )
    : [];
  const eligiblePrograms = selectEligibleProgramIds(
    candidates,
    applications,
    input.studentId,
    {
      departmentCode: student.departmentCode,
      grade: student.grade,
      progressRate: assessment.progressRate,
      totalCredits: calculation.inputs.totalCredits,
      completedCourseIds: calculation.inputs.completedCourseIds,
    },
  );

  return { ...calculation, eligiblePrograms };
}
