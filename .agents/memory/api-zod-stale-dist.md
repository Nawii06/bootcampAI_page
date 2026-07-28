---
name: Stale dist in composite TS packages
description: Type errors in api-server can come from stale lib/*/dist declarations, not the source
---
Rule: when `tsc --noEmit` in artifacts/api-server reports errors that contradict the shared package source (e.g. `@workspace/api-zod`), rebuild the referenced package with `npx tsc -b` in its directory before debugging the consumer.

**Why:** api-server's tsconfig uses project references to `lib/api-zod` and `lib/db`, which are composite projects emitting declarations to `dist/`. Even though package.json exports point at `src/index.ts`, tsc resolves types through the referenced project's `dist` output — so a stale dist silently overrides current source types.

**How to apply:** any TS2769/type mismatch on a `@workspace/*` import: check `dist/*.d.ts` mtime vs `src`, run `npx tsc -b` in the lib package, then re-run the consumer's type check.
