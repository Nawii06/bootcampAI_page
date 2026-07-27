# PostgreSQL backup, migration, and restore runbook

Last reviewed: 2026-07-27

## Account separation

Provision three different login roles. Never reuse the API runtime credential:

- migration role: owns application schema objects and runs only during release;
- runtime role: reads and changes application rows, but cannot alter schema;
- backup role: read-only access needed by `pg_dump`.

The roles must not have `SUPERUSER`, `CREATEDB`, `CREATEROLE`, or replication
privileges. Apply [postgres-grants.sql](../deploy/postgres-grants.sql) using an
approved DBA session after creating the roles:

```powershell
psql $env:DBA_DATABASE_URL `
  -v migration_role=bootcamp_migrator `
  -v runtime_role=bootcamp_app `
  -v backup_role=bootcamp_backup `
  -f deploy/postgres-grants.sql
```

Passwords and connection URLs belong in the approved secret manager, not this
command, shell history, or repository.

## Migration

Supply the migration URL directly or through a mounted secret:

```powershell
$env:MIGRATION_DATABASE_URL_FILE="/run/secrets/migration_database_url"
$env:MIGRATION_EXPECTED_USER="bootcamp_migrator"
pnpm db:migrate:production
```

The wrapper rejects an unexpected username and rejects an identical runtime and
migration URL. Review generated SQL and take a verified backup before applying
a migration. Do not run `drizzle-kit push` in production.

## Backup

Install PostgreSQL client tools matching the database major version. Configure
the read-only backup URL and an encrypted output volume:

```powershell
$env:BACKUP_DATABASE_URL_FILE="/run/secrets/backup_database_url"
$env:BACKUP_DIR="D:\encrypted-backups\bootcamp"
pnpm db:backup
```

The command creates a compressed PostgreSQL custom-format dump and adjacent
JSON metadata containing creation time, database name, size, and SHA-256. The
password is passed through `PGPASSWORD`, not a command argument or log.

Copy the dump and metadata together to approved backup storage. Apply immutable
retention, encryption, access logging, geographic redundancy, and the
institution's personal-information retention policy. This script intentionally
does not delete old backups.

## Verification

Verify both the recorded SHA-256 and PostgreSQL archive catalog:

```powershell
pnpm db:backup:verify "D:\encrypted-backups\bootcamp\bootcamp-<timestamp>.dump"
```

A backup is not considered successful until this command passes and the copy
to protected storage is confirmed.

## Restore rehearsal

Create an empty, isolated recovery database with no public application traffic.
Supply a restore-only connection URL:

```powershell
$env:RESTORE_DATABASE_URL_FILE="/run/secrets/restore_database_url"
$env:CONFIRM_DB_RESTORE="restore:bootcamp_recovery"
pnpm db:restore "D:\encrypted-backups\bootcamp\bootcamp-<timestamp>.dump"
```

The command verifies the archive and refuses to restore when the target public
schema already contains tables. It does not use `--clean` and cannot overwrite
an existing application database.

For an approved production disaster-recovery event, both the exact database
confirmation and `ALLOW_PRODUCTION_RESTORE=approved-change-ticket` are required.
The latter is an execution guard, not a substitute for institutional approval.

## Post-restore validation

1. Run `pnpm db:verify`.
2. Confirm Drizzle migration history and expected table counts.
3. Start an isolated API instance and check `/api/readyz`.
4. Test authentication, RBAC, audit writes, course import idempotency, file
   relationships, completion calculations, and published-content visibility.
5. Confirm every referenced S3 object exists and validates against stored hash
   metadata.
6. Record RPO, RTO, archive SHA-256, operators, timestamps, findings, and
   destruction time for the rehearsal environment.

Perform a restore rehearsal at least quarterly and after material database,
storage, encryption, or hosting changes.
