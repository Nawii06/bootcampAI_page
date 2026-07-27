import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectFileHashes,
  verifyReleaseManifest,
} from "./release-manifest.mjs";

test("creates deterministic sorted hashes and detects artifact changes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bootcamp-release-"));
  const artifact = path.join(root, "dist");
  await mkdir(artifact);
  await writeFile(path.join(artifact, "b.js"), "b");
  await writeFile(path.join(artifact, "a.js"), "a");
  try {
    const files = collectFileHashes(artifact, root);
    assert.deepEqual(files.map((entry) => entry.path), ["dist/a.js", "dist/b.js"]);
    const manifest = { schemaVersion: 1, files };
    assert.equal(verifyReleaseManifest(manifest, root), 2);
    await writeFile(path.join(artifact, "a.js"), "changed");
    assert.throws(() => verifyReleaseManifest(manifest, root), /verification failed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
