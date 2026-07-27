import assert from "node:assert/strict";
import test from "node:test";
import {
  AttendanceEventInputSchema,
  ProgramLearningQuerySchema,
} from "@workspace/api-zod";

const sessionId = "fd010000-0000-4000-8000-000000000211";

test("validates attendance event time order", () => {
  const result = AttendanceEventInputSchema.safeParse({
    sessionId,
    sequence: 1,
    title: "1차 교육",
    startsAt: "2026-07-27T02:00:00.000Z",
    endsAt: "2026-07-27T01:00:00.000Z",
  });
  assert.equal(result.success, false);
});

test("validates student learning query identifiers", () => {
  assert.equal(ProgramLearningQuerySchema.safeParse({
    sessionId,
    studentId: "fd010000-0000-4000-8200-000000000001",
  }).success, true);
  assert.equal(ProgramLearningQuerySchema.safeParse({
    sessionId,
    studentId: "not-a-student-id",
  }).success, false);
});
