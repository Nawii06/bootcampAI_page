import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { FileUploadMetadataSchema } from "@workspace/api-zod";
import {
  persistEvidenceFile,
  removePersistedFile,
  validateEvidenceFile,
} from "./storage";

test("accepts a PDF only when extension, MIME and signature agree", () => {
  const buffer = Buffer.from("%PDF-1.7 test");
  assert.equal(
    validateEvidenceFile({
      originalname: "evidence.pdf",
      mimetype: "application/pdf",
      size: buffer.length,
      buffer,
    }),
    "pdf",
  );
  assert.throws(() =>
    validateEvidenceFile({
      originalname: "spoofed.pdf",
      mimetype: "application/pdf",
      size: 4,
      buffer: Buffer.from("MZ00"),
    }),
  );
});

test("parses multipart personal-information flags without treating false as true", () => {
  assert.equal(
    FileUploadMetadataSchema.parse({ containsPersonalInfo: "false" })
      .containsPersonalInfo,
    false,
  );
  assert.equal(
    FileUploadMetadataSchema.parse({ containsPersonalInfo: "true" })
      .containsPersonalInfo,
    true,
  );
});

test("removes a persisted file when a later database transaction fails", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "bootcamp-files-"));
  const previous = process.env.FILE_STORAGE_DIR;
  process.env.FILE_STORAGE_DIR = directory;
  try {
    const persisted = await persistEvidenceFile(Buffer.from("%PDF-test"), "pdf");
    await access(path.join(directory, persisted.storageKey));
    await removePersistedFile(persisted.storageKey);
    await assert.rejects(access(path.join(directory, persisted.storageKey)));
  } finally {
    if (previous === undefined) delete process.env.FILE_STORAGE_DIR;
    else process.env.FILE_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
