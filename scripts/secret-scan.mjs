#!/usr/bin/env node
/**
 * Secret scanner for staged files (pre-commit) or arbitrary files.
 *
 * Usage:
 *   node scripts/secret-scan.mjs --staged     # scan all staged files (used by .git/hooks/pre-commit)
 *   node scripts/secret-scan.mjs <file...>    # scan specific files
 *
 * Allowlisting:
 *   - Lines containing `secret-scan:allow` are skipped.
 *   - Paths matching patterns in .secretscanignore (one glob-ish regex per line, # comments) are skipped.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const RULES = [
  { name: "AWS access key id", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
  { name: "OpenAI API key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: "Stripe key", re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  {
    name: "Connection string with credentials",
    re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]{6,}@/i,
  },
  {
    name: "Hardcoded credential assignment",
    re: /\b(?:api[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token|client[_-]?secret|password|passwd)\b['"]?\s*[:=]\s*['"][A-Za-z0-9+/_=-]{16,}['"]/i,
  },
];

const ALLOW_MARKER = "secret-scan:allow";
const PLACEHOLDER_RE =
  /\b(?:example|placeholder|changeme|change-me|your[_-]?|dummy|sample|xxxx|test[_-]?fixture|<[^>]+>|\$\{[^}]+\}|process\.env)/i;

function loadIgnorePatterns() {
  if (!existsSync(".secretscanignore")) return [];
  return readFileSync(".secretscanignore", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => new RegExp(l));
}

function stagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

function stagedContent(file) {
  try {
    return execFileSync("git", ["show", `:${file}`], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function isBinary(content) {
  return content.includes("\0");
}

const args = process.argv.slice(2);
const useStaged = args.includes("--staged");
const ignores = loadIgnorePatterns();
const files = useStaged ? stagedFiles() : args.filter((a) => a !== "--staged");

const findings = [];
for (const file of files) {
  if (ignores.some((re) => re.test(file))) continue;
  const content = useStaged ? stagedContent(file) : existsSync(file) ? readFileSync(file, "utf8") : null;
  if (content == null || isBinary(content)) continue;
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (line.includes(ALLOW_MARKER)) return;
    for (const rule of RULES) {
      const m = line.match(rule.re);
      if (!m) continue;
      // Skip obvious placeholders/examples.
      if (PLACEHOLDER_RE.test(line)) continue;
      findings.push({ file, line: i + 1, rule: rule.name, match: m[0].slice(0, 8) + "…" });
    }
  });
}

if (findings.length) {
  console.error("\n✖ Potential secrets detected — commit blocked:\n");
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.match}`);
  }
  console.error(
    "\nIf this is a false positive:\n" +
      "  - add a `secret-scan:allow` comment on that line, or\n" +
      "  - add a path regex to .secretscanignore\n" +
      "Real secrets belong in Replit Secrets / environment variables, never in git.\n",
  );
  process.exit(1);
}
process.exit(0);
