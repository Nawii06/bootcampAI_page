import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAllowedExternalUrl,
  parseImportBuffer,
  sha256,
  validateImportFile,
} from "./import-parser";

test("parses JSON and CSV into staging rows", () => {
  const jsonRows = parseImportBuffer(
    Buffer.from('[{"courseCode":"AI101","name":"AI 기초"}]'),
    "json",
  );
  const csvRows = parseImportBuffer(
    Buffer.from("courseCode,name\nAI102,머신러닝\n"),
    "csv",
  );
  assert.equal(jsonRows[0]?.courseCode, "AI101");
  assert.equal(csvRows[0]?.name, "머신러닝");
});

test("validates file metadata and produces stable hashes", () => {
  assert.equal(
    validateImportFile({
      originalname: "courses.csv",
      mimetype: "text/csv",
      size: 10,
    }),
    "csv",
  );
  assert.equal(sha256(Buffer.from("same")), sha256(Buffer.from("same")));
});

test("external API requires HTTPS and an explicit host allowlist", () => {
  const previous = process.env.IMPORT_API_ALLOWED_HOSTS;
  process.env.IMPORT_API_ALLOWED_HOSTS = "api.example.edu";
  assert.equal(
    assertAllowedExternalUrl("https://api.example.edu/courses").hostname,
    "api.example.edu",
  );
  assert.throws(() => assertAllowedExternalUrl("http://api.example.edu/courses"));
  assert.throws(() => assertAllowedExternalUrl("https://evil.example/courses"));
  process.env.IMPORT_API_ALLOWED_HOSTS = previous;
});
