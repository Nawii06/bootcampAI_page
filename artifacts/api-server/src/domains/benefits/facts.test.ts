import assert from "node:assert/strict";
import test from "node:test";
import { toBenefitFacts } from "./facts";

test("derives stable benefit facts from persisted student aggregates", () => {
  assert.deepEqual(
    toBenefitFacts({
      studentId: "student",
      grade: "3",
      departmentCode: "AI",
      totalCredits: 18,
      passedCourseCount: 6,
      completedProgramCount: 2,
      experientialHours: 80,
      progressRate: 75,
    }),
    {
      departmentCode: "AI",
      grade: 3,
      totalCredits: 18,
      passedCourseCount: 6,
      completedProgramCount: 2,
      experientialHours: 80,
      progressRate: 75,
    },
  );
});
