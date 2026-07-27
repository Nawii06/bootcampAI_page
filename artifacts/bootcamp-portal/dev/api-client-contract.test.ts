import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { ApiError, customFetch } from "@workspace/api-client-react";

test("typed API error exposes server code, request ID, and field errors", async () => {
  const server = createServer((_req, res) => {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "요청값이 올바르지 않습니다.",
        requestId: "request-test-001",
        fieldErrors: [{ field: "title", code: "too_small", message: "제목이 필요합니다." }],
      },
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as AddressInfo;
    await assert.rejects(
      () => customFetch(`http://127.0.0.1:${address.port}/error`, { responseType: "json" }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.code, "VALIDATION_ERROR");
        assert.equal(error.requestId, "request-test-001");
        assert.equal(error.fieldErrors?.[0]?.field, "title");
        assert.match(error.message, /요청값이 올바르지 않습니다/);
        return true;
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
