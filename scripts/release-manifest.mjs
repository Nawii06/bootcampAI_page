import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function collectFileHashes(root, repositoryRoot = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  if (!existsSync(resolvedRoot)) throw new Error(`Required release path is missing: ${root}`);
  const files = [];
  const addFile = (target, stat = lstatSync(target)) => {
    files.push({
      path: path.relative(repositoryRoot, target).replaceAll("\\", "/"),
      sizeBytes: stat.size,
      sha256: sha256(target),
    });
  };
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const target = path.join(directory, name);
      const stat = lstatSync(target);
      if (stat.isSymbolicLink()) throw new Error(`Release artifacts cannot contain symlinks: ${target}`);
      if (stat.isDirectory()) visit(target);
      else if (stat.isFile()) addFile(target, stat);
    }
  };
  const rootStat = lstatSync(resolvedRoot);
  if (rootStat.isSymbolicLink()) {
    throw new Error(`Release artifacts cannot contain symlinks: ${resolvedRoot}`);
  }
  if (rootStat.isFile()) addFile(resolvedRoot, rootStat);
  else visit(resolvedRoot);
  return files;
}

function gitOutput(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export function createReleaseManifest({
  repositoryRoot = process.cwd(),
  commit = process.env.GITHUB_SHA || gitOutput(["rev-parse", "HEAD"]),
  generatedAt = new Date().toISOString(),
  sourceDirty = gitOutput(["status", "--porcelain"]).length > 0,
} = {}) {
  const artifactRoots = [
    "artifacts/api-server/dist",
    "artifacts/bootcamp-portal/dist/public",
    "deploy",
  ];
  const files = artifactRoots.flatMap((root) =>
    collectFileHashes(path.join(repositoryRoot, root), repositoryRoot),
  );
  files.push(
    ...collectFileHashes(path.join(repositoryRoot, "lib/db/drizzle"), repositoryRoot),
    ...collectFileHashes(path.join(repositoryRoot, "pnpm-lock.yaml"), repositoryRoot),
  );
  files.sort((left, right) => left.path.localeCompare(right.path));
  return {
    schemaVersion: 1,
    releaseId: `${commit.slice(0, 12)}-${generatedAt.replace(/[:.]/g, "-")}`,
    commit,
    generatedAt,
    sourceDirty,
    nodeVersion: process.version,
    files,
  };
}

export function verifyReleaseManifest(manifest, repositoryRoot = process.cwd()) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) {
    throw new Error("Unsupported release manifest.");
  }
  for (const entry of manifest.files) {
    const target = path.resolve(repositoryRoot, entry.path);
    if (!existsSync(target) || lstatSync(target).isSymbolicLink()) {
      throw new Error(`Manifest file is missing or invalid: ${entry.path}`);
    }
    const stat = lstatSync(target);
    if (stat.size !== entry.sizeBytes || sha256(target) !== entry.sha256) {
      throw new Error(`Manifest verification failed: ${entry.path}`);
    }
  }
  return manifest.files.length;
}

function run() {
  const [command, manifestArgument = ".release/release-manifest.json"] =
    process.argv.slice(2);
  const manifestPath = path.resolve(manifestArgument);
  if (command === "generate") {
    const manifest = createReleaseManifest();
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: "w",
    });
    console.log(`Release manifest generated: ${manifestPath}`);
    return;
  }
  if (command === "verify") {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const count = verifyReleaseManifest(manifest);
    console.log(`Release manifest verified: ${count} files`);
    return;
  }
  throw new Error("Usage: release-manifest.mjs <generate|verify> [manifest.json]");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
