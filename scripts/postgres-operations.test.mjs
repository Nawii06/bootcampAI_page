import assert from "node:assert/strict";
import test from "node:test";
import { createBackupPlan } from "./postgres-backup.mjs";
import {
  parsePostgresConnection,
  readSecretValue,
} from "./postgres-tools.mjs";
import { migrationEnvironment } from "./run-migrations.mjs";

test("builds a custom-format backup without placing credentials in arguments", () => {
  const plan = createBackupPlan(
    {
      BACKUP_DATABASE_URL:
        "postgresql://backup_user:p%40ssword@db.internal:5432/bootcamp?sslmode=require",
      BACKUP_DIR: ".data/test-backups",
    },
    new Date("2026-07-27T00:00:00.000Z"),
  );
  assert.equal(plan.connection.pgEnvironment.PGPASSWORD, "p@ssword");
  assert.equal(plan.connection.pgEnvironment.PGSSLMODE, "require");
  assert.equal(plan.args.some((value) => value.includes("p@ssword")), false);
  assert.match(plan.dumpPath, /bootcamp-2026-07-27T00-00-00-000Z\.dump$/);
});

test("requires a separate expected migration identity", () => {
  const environment = migrationEnvironment({
    MIGRATION_DATABASE_URL:
      "postgresql://bootcamp_migrator:secret@db/bootcamp",
    MIGRATION_EXPECTED_USER: "bootcamp_migrator",
    DATABASE_URL: "postgresql://bootcamp_app:other@db/bootcamp",
  });
  assert.match(environment.DATABASE_URL, /bootcamp_migrator/);
  assert.throws(
    () =>
      migrationEnvironment({
        MIGRATION_DATABASE_URL:
          "postgresql://bootcamp_app:secret@db/bootcamp",
        MIGRATION_EXPECTED_USER: "bootcamp_migrator",
      }),
    /does not match/,
  );
});

test("rejects unsupported URLs and ambiguous secret sources", () => {
  assert.throws(() => parsePostgresConnection("mysql://user:pass@db/name"));
  assert.throws(() =>
    readSecretValue(
      { DATABASE_URL: "direct", DATABASE_URL_FILE: "file" },
      "DATABASE_URL",
    ),
  );
});
