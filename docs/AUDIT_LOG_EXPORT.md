# Audit-log access and export

Last reviewed: 2026-07-27

## Access model

`AUDITOR` and `SYSTEM_ADMIN` may query audit logs. Server-side RBAC protects the
API; hiding a portal menu is not treated as authorization.

- `GET /api/v1/audit-logs`
- `POST /api/v1/audit-logs/export`

Queries support start/end time, actor user ID, action, resource type, resource
ID, and pagination. One query or export may cover at most 93 days.

## Masking

Before returning or exporting a record, the server recursively masks keys
associated with passwords, secrets, tokens, authorization, cookies, bank
accounts, resident numbers, phones, email addresses, and addresses. IPv4
addresses are reduced to `/24`; IPv6 addresses are reduced to `/48`. User-agent
values are truncated.

Masking is performed on the server and therefore applies equally to the portal,
direct API clients, and CSV export.

## CSV export

An export requires:

- an explicit start and end time;
- a stated purpose of at least five characters;
- `AUDITOR` or `SYSTEM_ADMIN` authorization.

Exports are capped at 10,000 records. Every export writes a separate audit
record containing the purpose, filters, format, and result count. Exported CSV
cells are quoted and spreadsheet-formula prefixes are neutralized.

The portal screen is available at `/admin/audit-logs`. Production procedures
should define who reviews export-purpose records and how long downloaded files
may remain outside the platform.
