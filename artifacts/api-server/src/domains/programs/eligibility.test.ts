import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateProgramEligibility,
  selectEligibleProgramIds,
} from "./eligibility";

test("evaluates progress, credits and prerequisite courses from DB facts", () => {
  const rules = {
    departmentCodes: ["AI_BOOTCAMP"],
    minimumGrade: 2,
    minimumProgressRate: 60,
    minimumCredits: 12,
    requiredCompletedCourseIds: ["course-a", "course-b"],
  };
  assert.equal(
    evaluateProgramEligibility(rules, {
      departmentCode: "AI_BOOTCAMP",
      grade: "3",
      progressRate: 75,
      totalCredits: 15,
      completedCourseIds: ["course-a", "course-b"],
    }).eligible,
    true,
  );
  const ineligible = evaluateProgramEligibility(rules, {
    departmentCode: "AI_BOOTCAMP",
    grade: "3",
    progressRate: 50,
    totalCredits: 9,
    completedCourseIds: ["course-a"],
  });
  assert.equal(ineligible.eligible, false);
  assert.equal(ineligible.reasons.length, 3);
});

test("excludes full sessions and programs already applied to", () => {
  const candidates = [
    {
      programId: "eligible",
      sessionId: "session-1",
      capacity: 2,
      eligibilityRules: {},
    },
    {
      programId: "full",
      sessionId: "session-2",
      capacity: 1,
      eligibilityRules: {},
    },
    {
      programId: "applied",
      sessionId: "session-3",
      capacity: 2,
      eligibilityRules: {},
    },
  ];
  const result = selectEligibleProgramIds(
    candidates,
    [
      { sessionId: "session-2", studentId: "other", status: "SELECTED" },
      { sessionId: "session-3", studentId: "student", status: "REJECTED" },
    ],
    "student",
    { departmentCode: "AI", grade: "3" },
  );
  assert.deepEqual(result, ["eligible"]);
});
