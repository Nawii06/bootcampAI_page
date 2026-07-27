import assert from "node:assert/strict";
import test from "node:test";
import {
  CourseMasterUpdateSchema,
  CourseOfferingInputSchema,
  CourseOfferingUpdateSchema,
  CurriculumInputSchema,
  CurriculumRequirementInputSchema,
} from "@workspace/api-zod";

const id = "fd010000-0000-4000-8000-000000000001";

test("validates separated course offering input", () => {
  const offering = CourseOfferingInputSchema.parse({
    courseMasterId: id,
    businessYearId: id,
    termId: id,
    credits: "3",
    capacity: 30,
  });
  assert.equal(offering.credits, 3);
  assert.equal(offering.sectionCode, "01");
  assert.equal(offering.isActive, true);
});

test("validates curriculum dates and DB-configured requirements", () => {
  assert.equal(
    CurriculumInputSchema.safeParse({
      businessYearId: id,
      code: "AI-2026",
      name: "AI 부트캠프",
      effectiveFrom: "2026-03-01T00:00:00.000Z",
      effectiveTo: "2026-02-01T00:00:00.000Z",
    }).success,
    false,
  );
  const requirement = CurriculumRequirementInputSchema.parse({
    code: "TOTAL",
    name: "총 학점",
    requirementType: "TOTAL_CREDITS",
    requiredValue: "18",
  });
  assert.equal(requirement.operator, "GTE");
  assert.equal(requirement.requiredValue, 18);
  assert.equal(
    CurriculumRequirementInputSchema.safeParse({
      code: "REQUIRED",
      name: "필수과목",
      requirementType: "REQUIRED_COURSE",
    }).success,
    false,
  );
});

test("rejects empty academic updates", () => {
  assert.equal(CourseMasterUpdateSchema.safeParse({}).success, false);
  assert.equal(CourseOfferingUpdateSchema.safeParse({}).success, false);
});
