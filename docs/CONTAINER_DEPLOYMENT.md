# Container deployment

Last reviewed: 2026-07-27

## Build model

Application compilation and runtime-image assembly are intentionally separated.
The existing dependency lock is tailored to the Windows build environment, so
CI first creates platform-neutral API and portal artifacts on Windows. A Linux
job then builds minimal runtime images from those artifacts without installing
workspace dependencies in the image.

```powershell
pnpm install --frozen-lockfile
pnpm verify
docker compose -f compose.production.yaml build
```

Required build outputs:

- `artifacts/api-server/dist`
- `artifacts/bootcamp-portal/dist/public`

## Runtime topology

```text
client -> portal nginx:8080 -> /api -> API:4000 -> PostgreSQL
                                      |
                                      +-> malware scanning service
                                      +-> S3-compatible object storage
```

Nginx serves the SPA, applies static security headers, limits request bodies,
and proxies `/api` without rewriting the path. The API trusts exactly one proxy
hop in the supplied Compose topology.

## Required production values

Copy `.env.example` to an approved secret/configuration store. At minimum,
provide:

- `CORS_ALLOWED_ORIGINS`
- `MALWARE_SCAN_URL`
- `IMPORT_API_ALLOWED_HOSTS`
- `FILE_STORAGE_DRIVER=s3`
- `S3_BUCKET` and `S3_REGION`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` only when the runtime does
  not receive an IAM role or workload identity

`S3_ENDPOINT` and `S3_FORCE_PATH_STYLE=true` support compatible providers such
as MinIO. Keep the bucket private. Uploaded objects use server-side AES-256
encryption and retain the application SHA-256 digest as object metadata.

Do not commit the resulting `.env`. The production Compose baseline consumes
four external secrets: `postgres_password`, `database_url`, `metrics_token`,
and `malware_scan_api_key`. Create them in the approved deployment secret
manager before starting Compose. The database URL must use the same PostgreSQL
credentials as the PostgreSQL password secret.

The API supports `DATABASE_URL_FILE`, `METRICS_TOKEN_FILE`,
`MALWARE_SCAN_API_KEY_FILE`, `AWS_*_FILE`, and future
`SSO_CLIENT_SECRET_FILE` variables. A direct secret and its `_FILE` counterpart
cannot be configured together.

## Pre-deployment validation

Prepare a production configuration file that references secret files by path,
then run:

```powershell
pnpm deploy:check .env.production
```

The check rejects mock authentication, non-HTTPS origins or scanner URLs,
missing database/metrics secrets, local production file storage, incomplete S3
settings, missing TLS ownership, zero trusted proxy hops, and placeholder
values. Secret values are never printed.

## Health and shutdown

- `GET /api/healthz` is a process liveness check.
- `GET /api/readyz` verifies database connectivity, the configured object
  storage bucket, and mandatory production malware-scanner configuration.
- The API handles `SIGTERM` and `SIGINT`, stops accepting requests, and closes
  the PostgreSQL pool with a 15-second upper bound.

The portal and API images contain Docker health checks. Portal startup waits for
the API to become healthy, and the API waits for PostgreSQL.

## Deployment sequence

1. Back up the database and verify recovery metadata.
2. Run approved migrations with a migration-only database account.
3. Build and scan immutable images.
4. Deploy the API and wait for readiness.
5. Deploy the portal.
6. Run public, authentication, RBAC, upload, and audit-export smoke tests.
7. Verify metrics collection and deliver a controlled test alert.
8. Record image digests, migration version, operator, and rollback target.

Authenticated downloads remain authorized and audited by the API. With S3
storage, the API returns a redirect to a short-lived signed URL (120 seconds by
default, configurable from 60 to 900 seconds); local storage continues to
stream the file through the API.

The Compose file is a reproducible baseline, not a replacement for managed
PostgreSQL, TLS termination, secrets management, or central monitoring.
