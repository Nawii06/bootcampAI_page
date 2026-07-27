# CI and security checks

Last reviewed: 2026-07-27

## Workflows

### CI

`.github/workflows/ci.yml` runs for pull requests, pushes to `main`, and manual
dispatches. It uses the Windows runner because the current frozen lockfile
intentionally contains Windows-native Vite, Rollup, esbuild, Tailwind, and
Lightning CSS packages.

The job:

1. installs pnpm 11.9.0 and Node.js 24;
2. installs dependencies from `pnpm-lock.yaml` without changing the lockfile;
3. validates `FD_Set_01`;
4. runs API and preview tests, all TypeScript checks, and production builds;
5. retains the portal and API build outputs for seven days.

It also creates and verifies a SHA-256 release manifest, builds both runtime
images, generates SPDX JSON SBOMs, and rejects fixed HIGH or CRITICAL container
vulnerabilities. Release manifests and SBOMs are retained for 30 days.

### Security

`.github/workflows/security.yml` contains two independent checks:

- Dependency Review runs for pull requests and rejects newly introduced
  dependencies with `high` or `critical` known vulnerabilities. It also rejects
  AGPL and SSPL licenses.
- Gitleaks scans the complete committed history on pull requests and pushes to
  `main`.

Both workflows use read-only repository permissions. No application secret or
database credential is required.

## Required repository settings

After the workflows have completed successfully at least once, protect `main`
and require these checks before merge:

- `Test, typecheck, and build`
- `Dependency review`
- `Secret scan`

Require pull requests and prevent bypass except for an explicitly documented
emergency procedure. GitHub's native secret scanning and push protection should
also be enabled when the repository plan supports them.

Configure a protected `production` GitHub Environment with required reviewers
and prevent self-approval. Deployment workflows must consume immutable image
digests and a validated release approval record rather than rebuilding source.

## Dependency audit status

The vulnerable `xlsx@0.18.5` parser has been removed. XLSX input now uses the
focused `read-excel-file` package, while CSV uses `csv-parse`. The production
audit currently reports no `high` or `critical` findings. Lower-severity
findings remain visible for scheduled dependency maintenance.

## Local equivalent

```bash
pnpm install --frozen-lockfile
pnpm fake-data:validate FD_Set_01
pnpm verify
pnpm audit --prod --audit-level high
```
