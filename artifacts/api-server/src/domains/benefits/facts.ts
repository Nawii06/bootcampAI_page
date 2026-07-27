export type BenefitStudentFactSource = {
  studentId: string;
  grade: string | null;
  departmentCode: string;
  totalCredits: number;
  passedCourseCount: number;
  completedProgramCount: number;
  experientialHours: number;
  progressRate: number;
};

export function toBenefitFacts(source: BenefitStudentFactSource) {
  const parsedGrade = Number(source.grade);
  return {
    departmentCode: source.departmentCode,
    grade: Number.isFinite(parsedGrade) ? parsedGrade : (source.grade ?? ""),
    totalCredits: source.totalCredits,
    passedCourseCount: source.passedCourseCount,
    completedProgramCount: source.completedProgramCount,
    experientialHours: source.experientialHours,
    progressRate: source.progressRate,
  };
}
