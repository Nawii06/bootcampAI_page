import type {
  CompletionInputs,
  CompletionRequirement,
} from "@workspace/api-zod";

export interface RequirementResult {
  id: string;
  name: string;
  type: CompletionRequirement["type"];
  required: number | string;
  actual: number | boolean;
  satisfied: boolean;
  shortage: number;
}

function numericResult(
  requirement: CompletionRequirement,
  actual: number,
): RequirementResult {
  const required = requirement.requiredValue ?? 1;
  const satisfied =
    requirement.operator === "LTE"
      ? actual <= required
      : requirement.operator === "EQ" || requirement.operator === "IN"
        ? actual === required
        : actual >= required;
  return {
    id: requirement.id,
    name: requirement.name,
    type: requirement.type,
    required,
    actual,
    satisfied,
    shortage:
      requirement.operator === "LTE"
        ? Math.max(0, actual - required)
        : Math.max(0, required - actual),
  };
}

export function calculateCompletion(
  requirements: CompletionRequirement[],
  inputs: CompletionInputs,
) {
  const results = requirements.map((requirement): RequirementResult => {
    switch (requirement.type) {
      case "TOTAL_CREDITS":
        return numericResult(requirement, inputs.totalCredits);
      case "TRACK_CREDITS":
        return numericResult(
          requirement,
          inputs.trackCredits[requirement.trackCode ?? ""] ?? 0,
        );
      case "EXTRACURRICULAR_HOURS":
        return numericResult(requirement, inputs.extracurricularHours);
      case "PROJECT":
        return numericResult(requirement, inputs.projectCount);
      case "FIELD_PRACTICE":
        return numericResult(requirement, inputs.fieldPracticeCount);
      case "INTERNSHIP":
        return numericResult(requirement, inputs.internshipCount);
      case "REQUIRED_COURSE": {
        const satisfied = Boolean(
          requirement.courseId &&
            inputs.completedCourseIds.includes(requirement.courseId),
        );
        return {
          id: requirement.id,
          name: requirement.name,
          type: requirement.type,
          required: requirement.courseId ?? "",
          actual: satisfied,
          satisfied,
          shortage: satisfied ? 0 : 1,
        };
      }
    }
  });

  const satisfied = results.filter((result) => result.satisfied);
  const missing = results.filter((result) => !result.satisfied);
  const progressRate =
    results.length === 0
      ? 100
      : Math.round((satisfied.length / results.length) * 10_000) / 100;

  return {
    completed: missing.length === 0,
    progressRate,
    satisfied,
    missing,
  };
}
