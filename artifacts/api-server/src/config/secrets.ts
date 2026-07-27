import { readFileSync } from "node:fs";

export const RUNTIME_SECRET_NAMES = [
  "DATABASE_URL",
  "METRICS_TOKEN",
  "MALWARE_SCAN_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "SSO_CLIENT_SECRET",
] as const;

export function loadRuntimeSecrets(
  environment: NodeJS.ProcessEnv = process.env,
  names: readonly string[] = RUNTIME_SECRET_NAMES,
) {
  for (const name of names) {
    const fileVariable = `${name}_FILE`;
    const secretPath = environment[fileVariable];
    if (!secretPath) continue;
    if (environment[name]) {
      throw new Error(`${name} and ${fileVariable} must not both be set.`);
    }
    let value: string;
    try {
      value = readFileSync(secretPath, "utf8").replace(/\r?\n$/, "");
    } catch {
      throw new Error(`Unable to read secret file configured by ${fileVariable}.`);
    }
    if (!value || value.includes("\0")) {
      throw new Error(`Secret file configured by ${fileVariable} is empty or invalid.`);
    }
    environment[name] = value;
  }
}
