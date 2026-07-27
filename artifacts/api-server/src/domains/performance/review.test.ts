import assert from "node:assert/strict";
import test from "node:test";
import {
  PerformanceEvidenceInputSchema,
  PerformanceReviewInputSchema,
} from "@workspace/api-zod";

test("validates a performance self-review with an improvement plan", () => {
  const parsed = PerformanceReviewInputSchema.parse({
    businessYearId: "00000000-0000-4000-8000-000000000001",
    question: "산업체 참여가 목표 수준에 도달했는가?",
    answerSummary: "프로젝트 참여기업은 증가했으나 인턴십 연계는 보완이 필요하다.",
    improvementPlan: "차년도 인턴십 협약 기업을 확대한다.",
  });
  assert.deepEqual(parsed.linkedIndicatorIds, []);
  assert.deepEqual(parsed.linkedEvidenceIds, []);
});

test("requires an improvement plan for a performance self-review", () => {
  assert.throws(() =>
    PerformanceReviewInputSchema.parse({
      businessYearId: "00000000-0000-4000-8000-000000000001",
      question: "성과가 충분한가?",
      answerSummary: "검토가 필요하다.",
      improvementPlan: "",
    }),
  );
});

test("validates a performance result evidence relationship", () => {
  assert.equal(PerformanceEvidenceInputSchema.safeParse({
    resultId: "fd010000-0000-4000-8720-000000000001",
    fileId: "fd010000-0000-4000-8800-000000000001",
    description: "산정 원자료",
  }).success, true);
});
