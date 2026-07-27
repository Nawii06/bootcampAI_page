import assert from "node:assert/strict";
import test from "node:test";
import { ApiErrorSchema } from "@workspace/api-zod";
import { z } from "zod";
import { ApiError, errorHandler } from "./api-error";

function invokeErrorHandler(error: unknown) {
  let statusCode = 200;
  let body: unknown;
  const request = {
    id: "req-contract-test",
    log: { error() {} },
  };
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };

  errorHandler(error, request as never, response as never, (() => {}) as never);
  return { statusCode, body };
}

test("ApiError is serialized with the shared error contract", () => {
  const result = invokeErrorHandler(
    new ApiError(403, "FORBIDDEN", "권한이 없습니다."),
  );

  assert.equal(result.statusCode, 403);
  assert.deepEqual(ApiErrorSchema.parse(result.body), {
    error: {
      code: "FORBIDDEN",
      message: "권한이 없습니다.",
      requestId: "req-contract-test",
    },
  });
});

test("ZodError is serialized with field-level validation details", () => {
  const validation = z.object({ academicYear: z.number().int() }).safeParse({
    academicYear: "2026",
  });
  assert.equal(validation.success, false);
  if (validation.success) return;

  const result = invokeErrorHandler(validation.error);
  const parsed = ApiErrorSchema.parse(result.body);

  assert.equal(result.statusCode, 400);
  assert.equal(parsed.error.code, "VALIDATION_ERROR");
  assert.equal(parsed.error.requestId, "req-contract-test");
  assert.equal(parsed.error.fieldErrors?.[0]?.field, "academicYear");
});
