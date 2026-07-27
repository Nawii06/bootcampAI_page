import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeMetricPath,
  recordHttpRequest,
  renderPrometheusMetrics,
  isValidBearerToken,
} from "./metrics";

test("normalizes resource identifiers and removes query strings", () => {
  assert.equal(
    normalizeMetricPath(
      "/api/v1/files/550e8400-e29b-41d4-a716-446655440000/download?token=secret",
    ),
    "/api/v1/files/:id/download",
  );
  assert.equal(
    normalizeMetricPath("/api/v1/programs/123/applications"),
    "/api/v1/programs/:id/applications",
  );
});

test("renders Prometheus counters and cumulative duration buckets", () => {
  recordHttpRequest("GET", "/api/v1/files/123", 200, 0.2);
  const output = renderPrometheusMetrics();
  assert.match(
    output,
    /bootcamp_api_http_requests_total\{method="GET",path="\/api\/v1\/files\/:id",status="200"\} 1/,
  );
  assert.match(output, /bootcamp_api_http_request_duration_seconds_bucket/);
  assert.doesNotMatch(output, /token=secret/);
});

test("requires an exact bearer token for internal metrics", () => {
  const token = "0123456789abcdef0123456789abcdef";
  assert.equal(isValidBearerToken(`Bearer ${token}`, token), true);
  assert.equal(isValidBearerToken("Bearer wrong", token), false);
  assert.equal(isValidBearerToken(undefined, token), false);
});
