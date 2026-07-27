import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateProductionReadiness,
  parseEnvFile,
} from "./production-readiness.mjs";

const valid = {
  NODE_ENV: "production",
  ENABLE_MOCK_AUTH: "false",
  CORS_ALLOWED_ORIGINS: "https://bootcamp.ac.kr",
  DATABASE_URL: "postgresql://service:secret@db/bootcamp",
  FILE_STORAGE_DRIVER: "s3",
  S3_BUCKET: "bootcamp-production",
  S3_REGION: "ap-northeast-2",
  MALWARE_SCAN_MODE: "http",
  MALWARE_SCAN_URL: "https://scanner.internal/scan",
  METRICS_ENABLED: "true",
  METRICS_TOKEN: "0123456789abcdef0123456789abcdef",
  TLS_TERMINATED_AT: "ingress",
  TRUST_PROXY_HOPS: "1",
};

test("accepts a complete production configuration", () => {
  assert.deepEqual(evaluateProductionReadiness(valid).errors, []);
});

test("rejects insecure origins, mock auth, and missing infrastructure", () => {
  const result = evaluateProductionReadiness({
    ...valid,
    ENABLE_MOCK_AUTH: "true",
    CORS_ALLOWED_ORIGINS: "http://localhost:4173",
    FILE_STORAGE_DRIVER: "local",
  });
  assert.ok(result.errors.length >= 3);
});

test("parses quoted deployment environment values", () => {
  assert.deepEqual(parseEnvFile("A=one\nB=\"two words\"\n# ignored\n"), {
    A: "one",
    B: "two words",
  });
});
