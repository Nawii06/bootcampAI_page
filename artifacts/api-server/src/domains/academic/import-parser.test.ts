import assert from "node:assert/strict";
import test from "node:test";
import writeXlsxFile from "write-excel-file/node";
import {
  MAX_IMPORT_ROWS,
  assertAllowedExternalUrl,
  parseImportBuffer,
  sha256,
  validateImportFile,
} from "./import-parser";

test("parses JSON and CSV into staging rows", async () => {
  const jsonRows = await parseImportBuffer(
    Buffer.from('[{"courseCode":"AI101","name":"AI 기초"}]'),
    "json",
  );
  const csvRows = await parseImportBuffer(
    Buffer.from("courseCode,name\nAI102,머신러닝\n"),
    "csv",
  );
  assert.equal(jsonRows[0]?.courseCode, "AI101");
  assert.equal(csvRows[0]?.name, "머신러닝");
});

test("rejects duplicate CSV headers and excessive rows", async () => {
  await assert.rejects(
    () => parseImportBuffer(Buffer.from("code,code\nA,B\n"), "csv"),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "INVALID_IMPORT_HEADERS",
  );
  const rows = Array.from(
    { length: MAX_IMPORT_ROWS + 1 },
    (_, index) => ({ courseCode: `C${index}` }),
  );
  await assert.rejects(
    () => parseImportBuffer(Buffer.from(JSON.stringify(rows)), "json"),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "IMPORT_ROW_LIMIT_EXCEEDED",
  );
});

test("parses the first XLSX worksheet into staging rows", async () => {
  const buffer = await writeXlsxFile([
    ["courseCode", "name", "defaultCredits"],
    ["AI201", "첨단 AI 실습", 3],
  ]).toBuffer();

  const rows = await parseImportBuffer(buffer, "xlsx");

  assert.deepEqual(rows, [
    {
      courseCode: "AI201",
      name: "첨단 AI 실습",
      defaultCredits: "3",
    },
  ]);
});

test("rejects malformed XLSX content with a stable API error", async () => {
  await assert.rejects(
    () => parseImportBuffer(Buffer.from("not-an-xlsx-archive"), "xlsx"),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "IMPORT_PARSE_FAILED",
  );
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
