import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  benefitEligibilityRules,
  benefitPolicies,
  completionAssessments,
  courseCompletions,
  courseOfferings,
  experientialRecords,
  programCompletions,
  programs,
  programSessions,
  students,
} from "@workspace/db/schema";
import type { BenefitStudentFactSource } from "./facts";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getPolicyWithRules(
  transaction: Transaction,
  policyId: string,
) {
  const [policy] = await transaction
    .select()
    .from(benefitPolicies)
    .where(eq(benefitPolicies.id, policyId));
  if (!policy) return undefined;
  const rules = await transaction
    .select()
    .from(benefitEligibilityRules)
    .where(eq(benefitEligibilityRules.policyId, policyId))
    .orderBy(asc(benefitEligibilityRules.sortOrder));
  return { policy, rules };
}

export async function loadBenefitStudentFactSources(
  transaction: Transaction,
  businessYearId: string,
  studentIds?: string[],
): Promise<BenefitStudentFactSource[]> {
  const studentWhere = and(
    eq(students.isActive, true),
    isNull(students.deletedAt),
    studentIds?.length ? inArray(students.id, studentIds) : undefined,
  );
  const studentRows = await transaction
    .select({
      id: students.id,
      grade: students.grade,
      departmentCode: students.departmentCode,
    })
    .from(students)
    .where(studentWhere)
    .limit(501);
  const ids = studentRows.map((row) => row.id);
  if (!ids.length) return [];

  const [courses, completedPrograms, experiences, assessments] =
    await Promise.all([
      transaction
        .select({
          studentId: courseCompletions.studentId,
          creditsEarned: courseCompletions.creditsEarned,
        })
        .from(courseCompletions)
        .innerJoin(
          courseOfferings,
          eq(courseOfferings.id, courseCompletions.courseOfferingId),
        )
        .where(
          and(
            inArray(courseCompletions.studentId, ids),
            eq(courseCompletions.passed, true),
            eq(courseOfferings.businessYearId, businessYearId),
          ),
        ),
      transaction
        .select({ studentId: programCompletions.studentId })
        .from(programCompletions)
        .innerJoin(
          programSessions,
          eq(programSessions.id, programCompletions.sessionId),
        )
        .innerJoin(programs, eq(programs.id, programSessions.programId))
        .where(
          and(
            inArray(programCompletions.studentId, ids),
            eq(programCompletions.completed, true),
            eq(programs.businessYearId, businessYearId),
          ),
        ),
      transaction
        .select({
          studentId: experientialRecords.studentId,
          hours: experientialRecords.hours,
        })
        .from(experientialRecords)
        .where(
          and(
            inArray(experientialRecords.studentId, ids),
            eq(experientialRecords.businessYearId, businessYearId),
            inArray(experientialRecords.status, ["VERIFIED", "COMPLETED"]),
            isNull(experientialRecords.deletedAt),
          ),
        ),
      transaction
        .select({
          studentId: completionAssessments.studentId,
          progressRate: completionAssessments.progressRate,
        })
        .from(completionAssessments)
        .where(
          and(
            inArray(completionAssessments.studentId, ids),
            eq(completionAssessments.businessYearId, businessYearId),
          ),
        )
        .orderBy(desc(completionAssessments.calculatedAt)),
    ]);

  const latestProgress = new Map<string, number>();
  for (const row of assessments) {
    if (!latestProgress.has(row.studentId)) {
      latestProgress.set(row.studentId, Number(row.progressRate));
    }
  }
  const courseCredits = new Map<string, number>();
  const courseCounts = new Map<string, number>();
  for (const row of courses) {
    courseCredits.set(
      row.studentId,
      (courseCredits.get(row.studentId) ?? 0) + Number(row.creditsEarned),
    );
    courseCounts.set(row.studentId, (courseCounts.get(row.studentId) ?? 0) + 1);
  }
  const programCounts = new Map<string, number>();
  for (const row of completedPrograms) {
    programCounts.set(
      row.studentId,
      (programCounts.get(row.studentId) ?? 0) + 1,
    );
  }
  const experienceHours = new Map<string, number>();
  for (const row of experiences) {
    experienceHours.set(
      row.studentId,
      (experienceHours.get(row.studentId) ?? 0) + Number(row.hours ?? 0),
    );
  }
  return studentRows.map((student) => {
    return {
      studentId: student.id,
      grade: student.grade,
      departmentCode: student.departmentCode,
      totalCredits: courseCredits.get(student.id) ?? 0,
      passedCourseCount: courseCounts.get(student.id) ?? 0,
      completedProgramCount: programCounts.get(student.id) ?? 0,
      experientialHours: experienceHours.get(student.id) ?? 0,
      progressRate: latestProgress.get(student.id) ?? 0,
    };
  });
}
