---
name: Bootcamp portal page tests
description: Conventions and environment quirks for loading/error-state page tests in the portal
---

- Shared page-test helpers (fetch stubs, mock auth, renderPage, cleanup wrappers, DOM shims) are centralized in the portal's `dev/page-test-utils.ts`; new test files must import it (its import side-effects install required global shims) rather than redefining helpers.
- **Why:** `mock.module()` is unavailable in the node:test + happy-dom runtime, so tests rely on AuthContext injection, fetch stubbing, and `setQueryData`.
- happy-dom lacks `ResizeObserver`; Radix primitives (react-use-size) throw on mount. A no-op ResizeObserver shim is needed in test setup for pages using such components.
- **How to apply:** when adding page tests, follow `dev/TESTING.md`; error-state tests assert an ErrorCard message + "다시 시도" retry button via a rejecting fetch stub with retry: 0.
