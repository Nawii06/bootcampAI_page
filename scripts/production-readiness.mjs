import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function hasSecret(values, name) {
  const direct = values[name];
  const file = values[`${name}_FILE`];
  return Boolean(direct || (file && existsSync(resolve(file))));
}

export function evaluateProductionReadiness(values) {
  const errors = [];
  const warnings = [];
  const requireValue = (name) => {
    if (!values[name]) errors.push(`${name} is required.`);
  };

  if (values.NODE_ENV !== "production") errors.push("NODE_ENV must be production.");
  if (values.ENABLE_MOCK_AUTH !== "false") {
    errors.push("ENABLE_MOCK_AUTH must be false.");
  }
  const origins = (values.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origins.length || origins.some((origin) => !origin.startsWith("https://"))) {
    errors.push("Every CORS_ALLOWED_ORIGINS entry must use HTTPS.");
  }
  if (!hasSecret(values, "DATABASE_URL")) errors.push("DATABASE_URL secret is required.");
  if (values.FILE_STORAGE_DRIVER !== "s3") {
    errors.push("FILE_STORAGE_DRIVER must be s3 for production readiness.");
  }
  requireValue("S3_BUCKET");
  requireValue("S3_REGION");
  if (
    values.MALWARE_SCAN_MODE !== "http" ||
    !values.MALWARE_SCAN_URL?.startsWith("https://")
  ) {
    errors.push("An HTTPS malware scanner is required.");
  }
  if (values.METRICS_ENABLED !== "true") errors.push("METRICS_ENABLED must be true.");
  if (!hasSecret(values, "METRICS_TOKEN")) errors.push("METRICS_TOKEN secret is required.");
  if (values.METRICS_TOKEN && values.METRICS_TOKEN.length < 32) {
    errors.push("METRICS_TOKEN must contain at least 32 characters.");
  }
  if (!["ingress", "load-balancer"].includes(values.TLS_TERMINATED_AT ?? "")) {
    errors.push("TLS_TERMINATED_AT must be ingress or load-balancer.");
  }
  if ((values.TRUST_PROXY_HOPS ?? "0") === "0") {
    errors.push("TRUST_PROXY_HOPS must reflect the production proxy topology.");
  }
  const serialized = JSON.stringify(values).toLowerCase();
  if (/change-me|example\.com|replace-me/.test(serialized)) {
    errors.push("Placeholder values remain in the production configuration.");
  }
  if (!values.IMPORT_API_ALLOWED_HOSTS) {
    warnings.push("IMPORT_API_ALLOWED_HOSTS is empty; external API imports are disabled.");
  }
  return { errors, warnings };
}

function run() {
  const argument = process.argv[2];
  const values = argument
    ? { ...process.env, ...parseEnvFile(readFileSync(resolve(argument), "utf8")) }
    : process.env;
  const result = evaluateProductionReadiness(values);
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  if (result.errors.length) {
    console.error(`Production readiness failed (${result.errors.length} error(s)).`);
    process.exitCode = 1;
    return;
  }
  console.log("Production readiness configuration passed.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
