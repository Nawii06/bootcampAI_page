import assert from "node:assert/strict";
import test from "node:test";
import { buildCompletionCalculation } from "./derivation";

test("builds completion inputs from persisted-domain rows", () => {
  const result = buildCompletionCalculation({
    requirements: [
      {
        id: "credits",
        name: "총 교과학점",
        requirementType: "TOTAL_CREDITS",
        operator: "GTE",
        requiredValue: "6",
        courseMasterId: null,
        trackCode: null,
      },
      {
        id: "ai-track",
        name: "AI 트랙",
        requirementType: "TRACK_CREDITS",
        operator: "GTE",
        requiredValue: "3",
        courseMasterId: null,
        trackCode: "AI",
      },
    ],
    courses: [
      { courseMasterId: "course-1", creditsEarned: "3.0", trackCode: "AI" },
      { courseMasterId: "course-2", creditsEarned: "3.0", trackCode: "DATA" },
    ],
    completedPrograms: [
      {
        startsAt: new Date("2026-07-01T09:00:00Z"),
        endsAt: new Date("2026-07-01T12:00:00Z"),
      },
    ],
    experiences: [
      { type: "PROJECT", hours: "20" },
      { type: "FIELD_PRACTICE", hours: "40" },
      { type: "OTHER", hours: "5" },
    ],
  });

  assert.equal(result.inputs.totalCredits, 6);
  assert.deepEqual(result.inputs.completedCourseIds, ["course-1", "course-2"]);
  assert.deepEqual(result.inputs.trackCredits, { AI: 3, DATA: 3 });
  assert.equal(result.inputs.extracurricularHours, 8);
  assert.equal(result.inputs.projectCount, 1);
  assert.equal(result.inputs.fieldPracticeCount, 1);
  assert.equal(result.inputs.internshipCount, 0);
  assert.equal(result.requirements[1]?.trackCode, "AI");
});
