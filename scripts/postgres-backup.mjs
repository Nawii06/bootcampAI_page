import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parsePostgresConnection,
  readSecretValue,
  sanitizeDatabaseName,
} from "./postgres-tools.mjs";

function run(command, args, pgEnvironment = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...pgEnvironment },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}.`);
}

export function createBackupPlan(environment, now = new Date()) {
  const connection = parsePostgresConnection(
    readSecretValue(environment, "BACKUP_DATABASE_URL"),
  );
  const directory = path.resolve(environment.BACKUP_DIR ?? ".data/backups");
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const filename = `${sanitizeDatabaseName(connection.database)}-${timestamp}.dump`;
  const dumpPath = path.join(directory, filename);
  return {
    connection,
    directory,
    dumpPath,
    metadataPath: `${dumpPath}.json`,
    args: [
      "--format=custom",
      "--compress=9",
      "--no-owner",
      "--no-privileges",
      "--file",
      dumpPath,
    ],
  };
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function backup() {
  const plan = createBackupPlan(process.env);
  mkdirSync(plan.directory, { recursive: true });
  run("pg_dump", plan.args, plan.connection.pgEnvironment);
  const metadata = {
    format: "postgresql-custom",
    createdAt: new Date().toISOString(),
    database: plan.connection.database,
    sha256: sha256(plan.dumpPath),
    sizeBytes: statSync(plan.dumpPath).size,
  };
  writeFileSync(plan.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
    flag: "wx",
  });
  console.log(`Backup completed: ${plan.dumpPath}`);
  console.log(`Backup metadata: ${plan.metadataPath}`);
}

export function verifyBackup(dumpPath) {
  const resolved = path.resolve(dumpPath);
  const metadataPath = `${resolved}.json`;
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (metadata.sha256 !== sha256(resolved)) {
    throw new Error("Backup SHA-256 verification failed.");
  }
  run("pg_restore", ["--list", resolved]);
  console.log(`Backup verification passed: ${resolved}`);
}

function restore(dumpPath) {
  const connection = parsePostgresConnection(
    readSecretValue(process.env, "RESTORE_DATABASE_URL"),
  );
  if (process.env.CONFIRM_DB_RESTORE !== `restore:${connection.database}`) {
    throw new Error(
      `Set CONFIRM_DB_RESTORE=restore:${connection.database} to confirm the exact target.`,
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_RESTORE !== "approved-change-ticket"
  ) {
    throw new Error("Production restore requires ALLOW_PRODUCTION_RESTORE=approved-change-ticket.");
  }
  verifyBackup(dumpPath);
  const check = spawnSync(
    "psql",
    ["--tuples-only", "--no-align", "--command", "select count(*) from pg_catalog.pg_tables where schemaname = 'public'"],
    {
      encoding: "utf8",
      shell: false,
      env: { ...process.env, ...connection.pgEnvironment },
    },
  );
  if (check.status !== 0) throw new Error("Unable to verify the restore target.");
  if (check.stdout.trim() !== "0") {
    throw new Error("Restore target is not empty; refusing to overwrite existing data.");
  }
  run(
    "pg_restore",
    ["--exit-on-error", "--no-owner", "--no-privileges", "--dbname", connection.database, path.resolve(dumpPath)],
    connection.pgEnvironment,
  );
  console.log(`Restore completed into database: ${connection.database}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, argument] = process.argv.slice(2);
  if (command === "backup") backup();
  else if (command === "verify" && argument) verifyBackup(argument);
  else if (command === "restore" && argument) restore(argument);
  else {
    console.error("Usage: postgres-backup.mjs <backup|verify|restore> [backup.dump]");
    process.exitCode = 1;
  }
}
