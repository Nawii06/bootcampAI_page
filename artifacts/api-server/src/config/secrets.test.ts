import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadRuntimeSecrets } from "./secrets";

test("loads an approved runtime secret from a file", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "bootcamp-secret-"));
  const secretPath = path.join(directory, "database-url");
  await writeFile(secretPath, "postgresql://service:secret@db/bootcamp\n"); // secret-scan:allow — fake test fixture
  const environment: NodeJS.ProcessEnv = { DATABASE_URL_FILE: secretPath };
  try {
    loadRuntimeSecrets(environment, ["DATABASE_URL"]);
    assert.equal(
      environment.DATABASE_URL,
      "postgresql://service:secret@db/bootcamp", // secret-scan:allow — fake test fixture
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects ambiguous direct and file-based secret configuration", () => {
  assert.throws(
    () =>
      loadRuntimeSecrets(
        {
          METRICS_TOKEN: "direct",
          METRICS_TOKEN_FILE: "not-read",
        },
        ["METRICS_TOKEN"],
      ),
    /must not both be set/,
  );
});
