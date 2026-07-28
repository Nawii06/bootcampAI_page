---
name: Rate limiting valid links vs. guesses
description: Why express-rate-limit skipSuccessfulRequests cannot exempt valid-token requests on a shared IP
---

Rule: to give valid-token requests a more generous allowance than invalid guesses on an unauthenticated endpoint, do NOT use `express-rate-limit` with `skipSuccessfulRequests` — implement a failure-only counter inside the handler, after the token lookup.

**Why:** `skipSuccessfulRequests` blocks *before* the handler runs, and its own 429 responses count as failures. Once tripped by guesses from a shared IP (campus/company NAT), valid-token requests are also pre-blocked for the rest of the window.

**How to apply:** keep a generous per-IP ceiling limiter as middleware (DB protection), then in the handler: look up the token first; only on lookup failure check/increment a per-IP failed-guess budget and return 429 when exhausted. Valid tokens never touch the budget.

Multi-instance note: both counters are now backed by a shared Postgres table (atomic INSERT ... ON CONFLICT fixed-window upsert), so budgets hold across replicas/restarts. Once counters are DB-shared, integration test files interfere with each other (same 127.0.0.1 key, shared table) — isolate rate-limit tests behind a unique client IP via TRUST_PROXY_HOPS=1 + X-Forwarded-For.
