import type {
  CompletionInputs,
  CompletionRequirement,
} from "@workspace/api-zod";

export interface CompletionSourceRows {
  requirements: Array<{
    id: string;
    name: string;
    requirementType: CompletionRequirement["type"];
    operator: NonNullable<CompletionRequirement["operator"]>;
    requiredValue: string | null;
    courseMasterId: string | null;
    trackCode: string | null;
  }>;
  courses: Array<{
    courseMasterId: string;
    creditsEarned: string;
    trackCode: string | null;
  }>;
  completedPrograms: Array<{ startsAt: Date; endsAt: Date }>;
  experiences: Array<{ type: string; hours: string | null }>;
}

export function buildCompletionCalculation(rows: CompletionSourceRows): {
  requirements: CompletionRequirement[];
  inputs: CompletionInputs;
} {
  const requirements = rows.requirements.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.requirementType,
    operator: row.operator,
    requiredValue: row.requiredValue === null ? undefined : Number(row.requiredValue),
    courseId: row.courseMasterId ?? undefined,
    trackCode: row.trackCode ?? undefined,
  }));
  const trackCredits: Record<string, number> = {};
  let totalCredits = 0;
  for (const course of rows.courses) {
    const credits = Number(course.creditsEarned);
    totalCredits += credits;
    if (course.trackCode) {
      trackCredits[course.trackCode] =
        (trackCredits[course.trackCode] ?? 0) + credits;
    }
  }
  const completedProgramHours = rows.completedPrograms.reduce(
    (total, program) =>
      total +
      Math.max(0, program.endsAt.getTime() - program.startsAt.getTime()) /
        3_600_000,
    0,
  );
  const countExperience = (type: string) =>
    rows.experiences.filter((record) => record.type === type).length;
  const otherExperienceHours = rows.experiences
    .filter((record) => record.type === "OTHER")
    .reduce((total, record) => total + Number(record.hours ?? 0), 0);

  return {
    requirements,
    inputs: {
      totalCredits,
      completedCourseIds: [
        ...new Set(rows.courses.map((course) => course.courseMasterId)),
      ],
      trackCredits,
      extracurricularHours: completedProgramHours + otherExperienceHours,
      projectCount: countExperience("PROJECT"),
      fieldPracticeCount: countExperience("FIELD_PRACTICE"),
      internshipCount: countExperience("INTERNSHIP"),
    },
  };
}
