# File retention and purge

Last reviewed: 2026-07-27

## Policy model

Retention periods are stored in `file_retention_policies`; they are not
hardcoded in upload logic. Migration `0005_freezing_hex.sql` provisions the
initial `DEFAULT_EVIDENCE` policy:

- general evidence: 1,825 days;
- files marked as containing personal information: 1,095 days.

Administrators must review these initial values against university policy and
applicable law before production use. A file records the policy used and its
calculated expiry when uploaded, so later policy edits do not silently rewrite
existing retention decisions.

## Management APIs

- `GET /api/v1/files/retention/policies`: `SYSTEM_ADMIN`, `AUDITOR`
- `PUT /api/v1/files/retention/policies/:id`: `SYSTEM_ADMIN`
- `POST /api/v1/files/:id/legal-hold`: `SYSTEM_ADMIN`, `AUDITOR`
- `POST /api/v1/files/retention/cleanup`: `SYSTEM_ADMIN`, `AUDITOR` for
  `dryRun: true`; actual execution requires `SYSTEM_ADMIN`

The current default policy cannot be disabled or demoted without first making
another active policy the default.

## Cleanup safeguards

Always run a dry run first:

```json
{
  "dryRun": true,
  "limit": 100
}
```

Each candidate is classified as `ELIGIBLE`, `SKIPPED_RELATION`, or
`SKIPPED_LEGAL_HOLD`. Files linked to assignments, budget evidence, company
commitments, CMS content, or performance evidence are never automatically
purged.

Actual cleanup is two-phase:

1. soft-delete and record `purgeRequestedAt` with a `PURGE_REQUEST` audit;
2. remove the binary, record `purgedAt`, and write a `PURGE` audit.

An interrupted cleanup can resume files with a pending purge request. Legal
hold creation and release require a reason and are independently audited.
