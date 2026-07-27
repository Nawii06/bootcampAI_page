import assert from "node:assert/strict";
import test from "node:test";
import { ExperientialRecordInputSchema } from "@workspace/api-zod";

const baseRecord = {
  businessYearId: "00000000-0000-4000-8000-000000000001",
  type: "PROJECT",
  title: "AI 비전 프로젝트",
  status: "SUBMITTED",
  evidence: {
    summary: "산업체 데이터로 객체 탐지 모델을 개발했다.",
    techStack: ["Python", "PyTorch"],
    outputLinks: ["https://github.com/example/project"],
    publicConsent: false,
  },
};

test("validates a project portfolio record and its public consent", () => {
  const parsed = ExperientialRecordInputSchema.parse(baseRecord);
  assert.equal(parsed.type, "PROJECT");
  assert.equal(parsed.evidence.publicConsent, false);
});

test("rejects non-URL portfolio output links", () => {
  assert.throws(() =>
    ExperientialRecordInputSchema.parse({
      ...baseRecord,
      evidence: {
        ...baseRecord.evidence,
        outputLinks: ["github project"],
      },
    }),
  );
});
