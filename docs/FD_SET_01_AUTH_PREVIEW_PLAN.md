# FD_Set_01 authentication preview plan

## Baseline inventory

| Area | Current implementation | Status before this change |
| --- | --- | --- |
| Role source | `roleCodeEnum`, PUBLIC plus 13 authenticated roles | COMPLETE |
| Production session API | `GET /api/v1/session`, development header identity | PARTIAL |
| Fake API | Public business years, courses, programs, companies, performance and content | PARTIAL |
| Student routes | dashboard, apply, status, completion, portfolio | COMPLETE |
| Company routes | dashboard, survey, project, evaluation, employment | COMPLETE |
| Administrator routes | dashboard and program, application, completion, company, budget, evidence and performance views | PARTIAL |
| Login | Disabled university SSO notice | MISSING fake preview |
| Portal authorization | Authentication check in `PortalLayout`; server endpoints enforce roles | PARTIAL |
| Shared auth contract | Authenticated user and session Zod schemas | PARTIAL |

## Preview design

- The Vite development adapter is active only while serving `FD_Set_01`.
- Fake sessions use an HttpOnly, SameSite=Lax cookie signed with a
  process-local random key. Restarting the preview invalidates sessions.
- The JSON fixture is cloned into memory; reset restores the clone.
- No fake identity or session is stored in localStorage.
- University SSO remains disabled and `BLOCKED_EXTERNAL`.
- Every identity default route is one of the routes currently registered in
  `App.tsx`; no placeholder menu link is introduced.

## Role navigation

Students use student routes, company applicant/manager identities use partner
routes, and staff/reviewer/administrator/auditor identities use existing
administrator routes. Fine-grained menus and read-only auditor enforcement are
implemented incrementally against routes that actually exist.

