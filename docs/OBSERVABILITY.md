# Observability and operational alerts

Last reviewed: 2026-07-27

## Structured logs

The API writes JSON logs in production and human-readable logs in development.
Every request receives a server-generated UUID in both `X-Request-Id` and the
structured log. Query strings are omitted from request logs. Authorization,
cookies, passwords, tokens, client secrets, API keys, and account-number fields
are redacted.

Recommended production settings:

```dotenv
LOG_LEVEL=info
```

Send stdout/stderr to the hosting platform's central log collector. Retain
security and audit records according to the approved institutional policy; do
not use application logs as a substitute for the database audit log.

## Prometheus metrics

Metrics are disabled by default. Production Compose enables the endpoint and
requires a random token containing at least 32 characters:

```dotenv
METRICS_ENABLED=true
METRICS_TOKEN=<secret-from-approved-secret-manager>
```

Scrape `GET /api/metrics` with:

```http
Authorization: Bearer <METRICS_TOKEN>
```

Do not expose this endpoint through a public ingress. The endpoint reports
process uptime, resident memory, request counts by method/path/status, and
request-duration histograms. UUID and numeric path segments are normalized and
query strings are discarded to prevent personal-data leakage and unbounded
label cardinality.

## Initial alert rules

Tune these thresholds after collecting a representative baseline:

- API readiness fails for 2 consecutive minutes: critical.
- 5xx ratio exceeds 2% for 5 minutes with at least 20 requests: warning.
- 5xx ratio exceeds 5% for 5 minutes: critical.
- p95 request duration exceeds 2 seconds for 10 minutes: warning.
- process restarts more than 3 times in 15 minutes: critical.
- resident memory exceeds 80% of the container limit for 10 minutes: warning.
- PostgreSQL connection saturation exceeds 80% for 10 minutes: warning.
- object-storage readiness or malware-scanner availability fails: critical.
- disk/volume capacity exceeds 80%: warning; 90%: critical.

Alert notifications should identify the environment, service, first occurrence,
current value, runbook link, and request IDs where available. Never include
request bodies, authentication headers, or personal information.

## TLS and ingress boundary

Terminate TLS at the approved load balancer or ingress and redirect HTTP to
HTTPS. Use TLS 1.2 or newer, automate certificate renewal, preserve exactly one
trusted proxy hop for the supplied topology, and restrict `/api/metrics` to the
monitoring network. The Nginx runtime emits CSP, framing denial, browser
security headers, and cross-origin opener isolation; the public ingress remains
responsible for HSTS policy appropriate to the final domain.

## Operational validation

1. Confirm `/api/healthz` succeeds without invoking dependencies.
2. Confirm `/api/readyz` fails when PostgreSQL or S3 is unavailable.
3. Confirm metrics requests without the token return `401`.
4. Confirm logs contain `requestId` and never contain session cookies or tokens.
5. Trigger a controlled test alert and record acknowledgement and recovery.
