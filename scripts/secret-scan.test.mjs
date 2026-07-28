import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SCANNER = fileURLToPath(new URL("./secret-scan.mjs", import.meta.url));

/**
 * Runs the scanner with the given args in the given cwd.
 * Returns { code, stderr }.
 */
function runScan(cwd, args) {
  try {
    execFileSync(process.execPath, [SCANNER, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stderr: "" };
  } catch (err) {
    return { code: err.status ?? 1, stderr: String(err.stderr ?? "") };
  }
}

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "secret-scan-test-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Fake secrets assembled from parts so this test file itself never contains
// scannable literals if the ignore rules change. secret-scan:allow is NOT
// used here; values are built at runtime.
const FAKE = {
  "AWS access key id": ["AKIA", "ABCDEFGHIJKLMNOP"].join(""),
  "GitHub token": ["ghp_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"].join(""),
  "GitHub fine-grained token": ["github_pat_", "11ABCDEFG0abcdefghijklmnopqrstuv"].join(""),
  "OpenAI API key": ["sk-", "proj-", "Abcdefghij0123456789Abcd"].join(""),
  "Anthropic API key": ["sk-", "ant-", "Abcdefghij0123456789Abcd"].join(""),
  "Stripe key": ["sk_", "live_", "Abcdefghij0123456789ZZ"].join(""),
  "Slack token": ["xoxb-", "1234567890-abcdefABCDEF"].join(""),
  "Google API key": ["AIza", "0123456789abcdefghijklmnopqrstuvwxy"].join(""),
  "Private key block": ["-----BEGIN RSA ", "PRIVATE KEY-----"].join(""),
  JWT: [
    "eyJ" + "hbGciOiJIUzI1NiJ9",
    "eyJ" + "zdWIiOiIxMjM0NTY3ODkwIn0",
    "abcdefghijklmnopqrstuvwx",
  ].join("."),
  "Connection string with credentials": ["postgres", "://user:supersecretpw@db.internal/app"].join(""),
  "Hardcoded credential assignment": ['api_key = "', "Abcdefghij0123456789", '"'].join(""),
};

test("each rule category is detected", async () => {
  for (const [ruleName, secret] of Object.entries(FAKE)) {
    await withTempDir(async (dir) => {
      const file = path.join(dir, "leak.txt");
      await writeFile(file, `some code\nconst v = ${secret}\n`);
      const { code, stderr } = runScan(dir, [file]);
      assert.equal(code, 1, `expected finding for rule "${ruleName}"`);
      assert.match(stderr, new RegExp(ruleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }
});

test("clean file passes", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "clean.txt");
    await writeFile(file, "hello world\nnothing secret here\n");
    assert.equal(runScan(dir, [file]).code, 0);
  });
});

test("secret-scan:allow marker suppresses a finding on that line only", async () => {
  await withTempDir(async (dir) => {
    const marker = ["secret-scan", "allow"].join(":");
    const allowed = path.join(dir, "allowed.txt");
    await writeFile(allowed, `token = ${FAKE["AWS access key id"]} // ${marker}\n`);
    assert.equal(runScan(dir, [allowed]).code, 0, "marker line should be skipped");

    const mixed = path.join(dir, "mixed.txt");
    await writeFile(
      mixed,
      `a = ${FAKE["AWS access key id"]} // ${marker}\nb = ${FAKE["Slack token"]}\n`,
    );
    const res = runScan(dir, [mixed]);
    assert.equal(res.code, 1, "non-marker line must still be flagged");
    assert.match(res.stderr, /Slack token/);
    assert.doesNotMatch(res.stderr, /AWS access key id/);
  });
});

test(".secretscanignore excludes matching paths only", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      path.join(dir, ".secretscanignore"),
      "# comment line\n\n^fixtures/\n",
    );
    await mkdir(path.join(dir, "fixtures"));
    await writeFile(path.join(dir, "fixtures", "fake.txt"), `k = ${FAKE["Slack token"]}\n`);
    await writeFile(path.join(dir, "real.txt"), `k = ${FAKE["Slack token"]}\n`);

    // Paths are matched as given on the command line, relative to cwd.
    assert.equal(runScan(dir, ["fixtures/fake.txt"]).code, 0, "ignored path should pass");
    const res = runScan(dir, ["real.txt"]);
    assert.equal(res.code, 1, "non-ignored path must be flagged");
    assert.match(res.stderr, /real\.txt/);
  });
});

test("placeholder-looking lines are skipped", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "placeholders.txt");
    await writeFile(
      file,
      [
        `example: ${FAKE["AWS access key id"]}`,
        `api_key = "your_key_here_0123456789" # your_ placeholder`,
        `url = postgres://user:changeme-pw@host/db  # changeme`,
      ].join("\n") + "\n",
    );
    assert.equal(runScan(dir, [file]).code, 0);
  });
});

test("--tracked mode scans git-tracked files and respects the ignore file", async () => {
  await withTempDir(async (dir) => {
    const git = (...args) =>
      execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } });
    git("init", "-q");
    git("config", "user.email", "t@t.test");
    git("config", "user.name", "t");

    await writeFile(path.join(dir, ".secretscanignore"), "^ignored\\.txt$\n");
    await writeFile(path.join(dir, "leak.txt"), `k = ${FAKE["Slack token"]}\n`);
    await writeFile(path.join(dir, "ignored.txt"), `k = ${FAKE["Slack token"]}\n`);
    await writeFile(path.join(dir, "untracked.txt"), `k = ${FAKE["AWS access key id"]}\n`);
    git("add", "leak.txt", "ignored.txt", ".secretscanignore");
    git("commit", "-q", "-m", "init");

    const res = runScan(dir, ["--tracked"]);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /leak\.txt/);
    assert.doesNotMatch(res.stderr, /ignored\.txt/, "ignore file must apply in --tracked mode");
    assert.doesNotMatch(res.stderr, /untracked\.txt/, "untracked files are out of scope");
    assert.match(res.stderr, /verify blocked/, "--tracked mode uses the verify wording");

    // Clean repo passes.
    git("rm", "-q", "leak.txt");
    git("commit", "-q", "-m", "clean");
    assert.equal(runScan(dir, ["--tracked"]).code, 0);
  });
});

test("binary content is skipped", async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, "bin.dat");
    await writeFile(file, Buffer.concat([Buffer.from([0]), Buffer.from(FAKE["Slack token"])]));
    assert.equal(runScan(dir, [file]).code, 0);
  });
});

// --- Lint the repo's REAL .secretscanignore file -------------------------
// A syntactically invalid regex line would crash the scan, and an over-broad
// pattern (e.g. ".*") would silently exclude everything from scanning.

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function realIgnoreLines() {
  return readFileSync(path.join(REPO_ROOT, ".secretscanignore"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

test("real .secretscanignore: every line compiles as a regex", () => {
  for (const line of realIgnoreLines()) {
    assert.doesNotThrow(() => new RegExp(line), `invalid regex in .secretscanignore: ${line}`);
  }
});

test("real .secretscanignore: no pattern matches representative source paths", () => {
  const canaryPaths = [
    "artifacts/api-server/src/index.ts",
    "artifacts/bootcamp-portal/src/main.tsx",
    "scripts/secret-scan.mjs",
    "packages/db/src/index.ts",
    ".env",
    "artifacts/api-server/.env.example",
  ];
  for (const line of realIgnoreLines()) {
    const re = new RegExp(line);
    for (const p of canaryPaths) {
      assert.ok(!re.test(p), `over-broad .secretscanignore pattern "${line}" matches source path "${p}"`);
    }
  }
});
