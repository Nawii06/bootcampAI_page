import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import type { RoleCode } from "@workspace/api-zod";
import { ApiError } from "../lib/api-error";
import { requireRoles } from "./auth";

function invoke(roles: RoleCode[]) {
  let received: unknown;
  const req = {
    auth: {
      id: "00000000-0000-4000-8000-000000000001",
      loginId: "tester",
      displayName: "테스터",
      roles,
    },
  } as unknown as Request;
  requireRoles("BUDGET_STAFF")(
    req,
    {} as Response,
    ((error?: unknown) => {
      received = error ?? "allowed";
    }) as NextFunction,
  );
  return received;
}

test("RBAC permits the required role and system administrator", () => {
  assert.equal(invoke(["BUDGET_STAFF"]), "allowed");
  assert.equal(invoke(["SYSTEM_ADMIN"]), "allowed");
});

test("RBAC rejects an unrelated role", () => {
  const result = invoke(["STUDENT"]);
  assert.ok(result instanceof ApiError);
  assert.equal(result.status, 403);
});
