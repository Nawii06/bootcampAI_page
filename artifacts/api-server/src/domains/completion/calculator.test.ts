import assert from "node:assert/strict";
import test from "node:test";
import { calculateCompletion } from "./calculator";

test("calculates satisfied and missing requirements without a stored boolean", () => {
  const result = calculateCompletion(
    [
      {
        id: "credits",
        name: "총 이수학점",
        type: "TOTAL_CREDITS",
        requiredValue: 12,
      },
      {
        id: "course",
        name: "필수 교과",
        type: "REQUIRED_COURSE",
        courseId: "course-1",
      },
      {
        id: "internship",
        name: "인턴십",
        type: "INTERNSHIP",
        requiredValue: 1,
      },
    ],
    {
      totalCredits: 15,
      completedCourseIds: ["course-1"],
      trackCredits: {},
      extracurricularHours: 0,
      projectCount: 0,
      fieldPracticeCount: 0,
      internshipCount: 0,
    },
  );

  assert.equal(result.completed, false);
  assert.equal(result.progressRate, 66.67);
  assert.deepEqual(
    result.missing.map((item) => item.id),
    ["internship"],
  );
  assert.equal(result.missing[0]?.shortage, 1);
});

test("an empty curriculum is complete", () => {
  const result = calculateCompletion([], {
    totalCredits: 0,
    completedCourseIds: [],
    trackCredits: {},
    extracurricularHours: 0,
    projectCount: 0,
    fieldPracticeCount: 0,
    internshipCount: 0,
  });

  assert.equal(result.completed, true);
  assert.equal(result.progressRate, 100);
});
