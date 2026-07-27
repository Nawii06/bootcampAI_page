import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePostgresConnection, readSecretValue } from "./postgres-tools.mjs";

export function migrationEnvironment(environment) {
  const migrationUrl = readSecretValue(environment, "MIGRATION_DATABASE_URL");
  const migration = parsePostgresConnection(migrationUrl);
  const expectedUser = environment.MIGRATION_EXPECTED_USER;
  if (expectedUser && migration.user !== expectedUser) {
    throw new Error("Migration URL user does not match MIGRATION_EXPECTED_USER.");
  }
  if (environment.DATABASE_URL && environment.DATABASE_URL === migrationUrl) {
    throw new Error("Runtime and migration database credentials must be different.");
  }
  return { ...environment, DATABASE_URL: migrationUrl };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/db", "migrate"],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: migrationEnvironment(process.env),
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
