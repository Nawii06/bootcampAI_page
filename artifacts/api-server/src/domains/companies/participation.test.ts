import assert from "node:assert/strict";
import test from "node:test";
import { CompanyParticipationInputSchema } from "@workspace/api-zod";

test("validates a company project participation snapshot", () => {
  const parsed = CompanyParticipationInputSchema.parse({
    businessYearId: "00000000-0000-4000-8000-000000000001",
    participationType: "PROJECT",
    title: "비전 기반 품질검사",
    details: {
      track: "autonomous",
      problemDefinition: "불량 검출 자동화",
    },
  });
  assert.equal(parsed.participantCount, 0);
  assert.equal(parsed.participationType, "PROJECT");
});

test("rejects negative company participant counts", () => {
  assert.throws(() =>
    CompanyParticipationInputSchema.parse({
      businessYearId: "00000000-0000-4000-8000-000000000001",
      participationType: "DEMAND_SURVEY",
      title: "인력 수요",
      details: {},
      participantCount: -1,
    }),
  );
});
