export interface ProgramEligibilityFacts {
  departmentCode: string;
  grade: string | null;
  progressRate?: number;
  totalCredits?: number;
  completedCourseIds?: string[];
}

export function evaluateProgramEligibility(
  rules: Record<string, unknown>,
  facts: ProgramEligibilityFacts,
) {
  const stringList = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  const departmentCodes = stringList(rules.departmentCodes);
  const requiredCompletedCourseIds = stringList(
    rules.requiredCompletedCourseIds,
  );
  const minimumGrade =
    typeof rules.minimumGrade === "number" ? rules.minimumGrade : undefined;
  const maximumGrade =
    typeof rules.maximumGrade === "number" ? rules.maximumGrade : undefined;
  const minimumProgressRate =
    typeof rules.minimumProgressRate === "number"
      ? rules.minimumProgressRate
      : undefined;
  const minimumCredits =
    typeof rules.minimumCredits === "number" ? rules.minimumCredits : undefined;
  const grade = Number(facts.grade);
  const completedCourseIds = new Set(facts.completedCourseIds ?? []);
  const reasons: string[] = [];

  if (departmentCodes.length && !departmentCodes.includes(facts.departmentCode)) {
    reasons.push("신청 가능한 학과가 아닙니다.");
  }
  if (minimumGrade && (!Number.isFinite(grade) || grade < minimumGrade)) {
    reasons.push(`최소 ${minimumGrade}학년 이상이어야 합니다.`);
  }
  if (maximumGrade && (!Number.isFinite(grade) || grade > maximumGrade)) {
    reasons.push(`최대 ${maximumGrade}학년까지 신청할 수 있습니다.`);
  }
  if (
    minimumProgressRate !== undefined &&
    (facts.progressRate ?? 0) < minimumProgressRate
  ) {
    reasons.push(`교육과정 진행률 ${minimumProgressRate}% 이상이 필요합니다.`);
  }
  if (
    minimumCredits !== undefined &&
    (facts.totalCredits ?? 0) < minimumCredits
  ) {
    reasons.push(`취득학점 ${minimumCredits}학점 이상이 필요합니다.`);
  }
  const missingCourses = requiredCompletedCourseIds.filter(
    (courseId) => !completedCourseIds.has(courseId),
  );
  if (missingCourses.length) {
    reasons.push(`필수 선수과목 ${missingCourses.length}개가 부족합니다.`);
  }

  return { eligible: reasons.length === 0, reasons };
}

export function selectEligibleProgramIds(
  candidates: Array<{
    programId: string;
    sessionId: string;
    capacity: number;
    eligibilityRules: Record<string, unknown>;
  }>,
  applications: Array<{
    sessionId: string;
    studentId: string;
    status: string;
  }>,
  studentId: string,
  facts: ProgramEligibilityFacts,
) {
  const activeStatuses = new Set([
    "SUBMITTED",
    "REVIEWING",
    "SELECTED",
    "WAITLISTED",
  ]);
  return [
    ...new Set(
      candidates
        .filter((candidate) => {
          const sessionApplications = applications.filter(
            (application) => application.sessionId === candidate.sessionId,
          );
          return (
            !sessionApplications.some(
              (application) => application.studentId === studentId,
            ) &&
            sessionApplications.filter((application) =>
              activeStatuses.has(application.status),
            ).length < candidate.capacity &&
            evaluateProgramEligibility(candidate.eligibilityRules, facts)
              .eligible
          );
        })
        .map((candidate) => candidate.programId),
    ),
  ];
}
