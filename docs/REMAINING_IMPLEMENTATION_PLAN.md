# Remaining implementation plan

Last reviewed: 2026-07-27  
Baseline: `main` at `ff7ecd0`

## Current state

The platform contains domain-separated Drizzle schemas, eight migrations, shared
request schemas, Express services and routers, API-backed portal screens, audit
insertion for major writes, and automated API/FD_Set_01 preview tests.

Docker is not installed on the reviewed Windows host. PostgreSQL migration,
seed, integration, and backup/restore execution therefore remain
`BLOCKED_EXTERNAL` on this host until a Docker engine or PostgreSQL instance is
available.

## API and UI coverage

| Domain | Existing API | Existing UI | Status |
| --- | --- | --- | --- |
| Courses/import | Course master and offering CRUD; stage, preview and commit import | Detailed master/offering create-edit controls plus JSON/CSV/XLSX import workflow | PARTIAL |
| Curriculum | Curriculum and requirement CRUD | Detailed curriculum/effective-period/requirement create-edit controls | PARTIAL |
| Programs | Program/session create and draft-edit, application writes; consolidated operations and student learning reads; attendance, assignment submission/grading, survey response and completion writes | Detailed program/session eligibility, completion-rule and schedule editing plus operations, assignment and survey screens | PARTIAL |
| Student completion | Client-supplied calculation and snapshots | Student/admin completion views | PARTIAL |
| Benefits | Policy lifecycle, DB-derived bulk candidate preview/commit, approval/payment writes and consolidated operations read | Dedicated bulk calculation, review, approval and ERP payment-status workflow | PARTIAL |
| Companies | Public companies, applicant/staff application reads, submit/resubmit/decision, master/contact/expert operations, commitment and participation writes | Public partners, applicant supplement workflow, administrator review and company-directory management | PARTIAL |
| Budget | Summary/history, detailed operations read and allocation/execution/change writes with validated evidence-file relationships | Summary, program/allocation details, evidence picker/download, operational actions and history | PARTIAL |
| Performance | Public/internal reads, target/result/review writes, DB-source COUNT/RATE formula calculation, evidence linking and publication workflow | Indicator, target, formula preview/commit, result, evidence, review and source-data views | PARTIAL |
| CMS | Public/internal lists, create/update, immutable version snapshots, attachment and role-separated review/publication transitions | Public resources/news plus editor/reviewer CMS with version history | PARTIAL |
| Files | Audited metadata list, validated upload, relationship-aware download/relationship reads and safe archive | Evidence upload/list, relationship inspection and download controls | PARTIAL |
| Authentication | Development header identity and server RBAC | Session-aware portal shell | PARTIAL |
| University SSO | Configuration placeholders only | Login placeholder | BLOCKED_EXTERNAL |

## Phase status

| Phase | Status | Exit evidence required |
| --- | --- | --- |
| 0. Inventory and plan | COMPLETE | This document and source inventory |
| 1. Reproducible PostgreSQL environment | PARTIAL | Compose, scripts and docs added; actual Docker run pending |
| 2. DB-derived student progress | PARTIAL | DB source aggregation, eligible-program calculation and unit tests added; PostgreSQL integration remains |
| 3. Academic administration | PARTIAL | CRUD/audit and detailed course, offering, curriculum and requirement create/edit/publish/archive UI added; PostgreSQL E2E remains |
| 4. Import administration | PARTIAL | JSON and CSV/XLSX/JSON upload UI added; PostgreSQL idempotency integration test remains |
| 5. Program operations | PARTIAL | Draft program/session detailed editing, session operations, student submission/response and staff grading UI plus FD_Set_01 workflow added; lifecycle controls and PostgreSQL E2E remain |
| 6. Benefits | PARTIAL | DB-derived bulk calculation snapshots, policy lifecycle, review/approval/payment UI and FD_Set_01 workflow added; PostgreSQL E2E remains |
| 7. Companies | PARTIAL | Applicant supplement/resubmit, staff approval, master/contact/expert management, commitment registration and FD_Set_01 workflow added; PostgreSQL E2E remains |
| 8. Budget | PARTIAL | Detailed allocation/execution UI, validated evidence picker/download, references, change actions and FD_Set_01 workflow added; PostgreSQL E2E remains |
| 9. Performance evidence | PARTIAL | DB-source COUNT/RATE formula preview/commit, evidence relationships and DRAFT→IN_REVIEW→PUBLISHED workflow added; additional formula types and PostgreSQL E2E remain |
| 10. CMS | PARTIAL | Internal list, draft editing, immutable version history, attachment, review and immediate/scheduled publication UI added; PostgreSQL E2E remains |
| 11. File authorization | PARTIAL | Download/archive/relationship/audit APIs, S3 signed URLs and FD_Set_01 workflow added; PostgreSQL/S3 E2E remains |
| 12. Shared contracts | COMPLETE | All portal JSON query reads, including public curriculum/recruitment, budget history, system status and FD_Set_01 operations, use shared runtime-validated response contracts |
| 13. Session/OIDC foundation | PARTIAL | Secure session; actual SSO remains external |
| 14. Test expansion | PARTIAL | API contract, FD_Set_01 HTTP role-matrix and CI suites added; PostgreSQL E2E remains |
| 15. Docker/CI/backup | PARTIAL | CI, SBOM/image scan, release manifest, runtime images, production proxy/Compose, backup verification and guarded restore tooling added; real PostgreSQL restore record remains |
| 16. Documentation | PARTIAL | Documents aligned with verified implementation |

## Implementation order

1. Finish and execute Phase 1 against PostgreSQL.
2. Implement DB-derived progress and program eligibility before dependent
   benefit workflows.
3. Add academic and program operational APIs before their administrator UI.
4. Complete benefits, companies, budget, performance, CMS, and file access in
   small transactional increments.
5. Converge response contracts, then add session/OIDC adapters.
6. Add PostgreSQL/HTTP/E2E/role tests and CI, followed by backup/restore
   verification and documentation reconciliation.

## Latest completed increment

- Added draft-only program and session update APIs with row locking, merged
  schedule validation, consistent errors and before/after audit records.
- Added detailed eligibility, completion rule, application period, operation
  period, capacity and venue editing to the administrator program screen.
- Added FD_Set_01 coverage for draft program creation followed by program and
  session edits through the shared production routes.
- Replaced fixed academic form values with detailed course master fields,
  including English name, description, department and preserved external keys.
- Added editable offering section, credits, capacity, instructor and term fields,
  plus curriculum effective periods and requirement type/operator/value/unit
  controls.
- Added FD_Set_01 integration assertions for offering-capacity and curriculum
  requirement edits through the production-compatible API routes.
- Added DB-configured COUNT and RATE performance formulas over named operational
  source aggregates, including precision and multiplier configuration.
- Added formula preview and transactional commit with calculation-version,
  timestamp, formula and source-count snapshots, plus audit records.
- Protected review/published results from automated overwrite and added
  administrator controls with FD_Set_01 preview/commit integration coverage.
- Added the `content_versions` migration with immutable numbered snapshots,
  change summaries, authorship, and attachment identifiers.
- Added draft-only content editing with row locking, transactional attachment
  replacement, legacy-content baseline backfill, audit metadata, and protected
  version-history reads.
- Added CMS edit/history controls and FD_Set_01 coverage proving v1/v2 history
  creation and published-content overwrite prevention.
- Added a budget-execution evidence picker backed by the audited stored-file
  list, plus relationship-aware evidence download links.
- Budget execution transactions now reject missing, archived, or purged evidence
  files and retain the evidence identifier in the creation audit snapshot.
- Added FD_Set_01 coverage for valid evidence linkage and deterministic
  rejection of nonexistent evidence.
- Added staff-managed company master updates, public/active controls, contact
  creation and soft archive, and expert creation and activation controls.
- Enforced server-side COMPANY_STAFF authorization, transactions, row locking
  where state is replaced, primary-contact normalization, and audit records for
  each company-directory mutation.
- Added administrator controls and FD_Set_01 integration coverage for company
  visibility, representative contacts, and expert lifecycle changes.
- Added policy-scoped bulk benefit candidate preview and commit using student,
  course, program, experiential, and latest completion-assessment DB facts.
- Added versioned calculation snapshots, a 500-student transaction limit,
  decided-candidate row protection, idempotent candidate upsert, and one
  aggregate audit record per committed run.
- Added BENEFIT_STAFF preview/confirm controls and matching FD_Set_01 contract
  coverage without changing already approved or rejected decisions.
- Added reason-required benefit-policy lifecycle transitions with row locking,
  transition validation, rule/expiry checks, and before/after audit records.
- Added BENEFIT_STAFF lifecycle controls to the benefit operations screen and
  FD_Set_01 coverage for close, invalid reopen rejection, archive, and final
  contract-valid status retrieval.
- Added release manifests, immutable SHA-pinned SBOM/image scanning, and
  separated-duty release approval record validation.
- Migrated performance indicator/target, evidence, CSV export, student program
  application/status, administrator selection, and program-list screens to
  shared runtime contracts.
- Extended program/session/application contracts with status, application
  windows, review notes, and submission timestamps.
- Implemented missing FD_Set_01 student application, duplicate/capacity checks,
  staff selection, and versioned performance-target creation with audit logs.
- Added Preview integration scenarios for application-to-selection and
  performance target version registration.
- Added shared contracts for company participation, consented student portfolio
  candidates, performance self-reviews, and performance source summaries.
- Migrated partner dashboard/project/demand-survey/evaluation and performance
  dashboard/self-review/source-data screens to runtime response validation.
- Implemented missing FD_Set_01 APIs for participation create/filter,
  consented-portfolio candidates, performance review create/list, and source
  summaries with role checks and audit logs.
- Added Preview integration scenarios covering partner ownership, student
  public consent, performance review lifecycle, and source-summary reads.
- Added shared contracts for authenticated sessions, FD_Set_01 identity
  discovery, public companies, public performance results, and paginated public
  content.
- Migrated login/session handling and the public home, partner-company,
  performance, news, and resource views to runtime response validation.
- Added a Preview integration scenario that validates all primary public
  homepage feeds against their shared contracts.
- Migrated the student dashboard, administrator dashboard, and student
  portfolio reads to shared runtime contracts.
- Added experiential-record list contracts covering evidence, output links,
  technology stacks, and explicit public-consent state.
- Implemented the previously missing FD_Set_01 experiential-record read/create
  API with student ownership isolation and audit logging.
- Added an end-to-end Preview scenario proving one student cannot see another
  student's portfolio records.
- Added reference, academic-list, import-job, and completion-assessment response
  contracts.
- Migrated academic administration, course import, student completion, and
  administrator completion screens to runtime response validation.
- Aligned FD_Set_01 course responses with production metadata by supplying
  active state and creation/update timestamps.
- FD_Set_01 tests now validate business-year, term, course, offering,
  curriculum, requirement, import-state, and completion-assessment responses.
- Added negative contract coverage for incomplete completion requirement facts.
- Added response contracts for program/session lists, applications, operational
  attendance/assignment/survey/completion data, student learning, and stored-file
  relationships.
- Migrated the program-operations, student-learning, and evidence-management
  screens to runtime contract validation.
- FD_Set_01 integration tests now validate actual program, application,
  learning, file-list, and relationship responses against the shared schemas.
- Added negative contract tests for missing assignment, participant, and
  file-to-domain relationship keys.
- Added response contracts for benefit operations, company lists/applications,
  and performance overviews.
- Migrated the benefit, company-administration, company-applicant, and
  performance-result screens from unchecked generic JSON reads to runtime
  contract validation.
- FD_Set_01 integration tests now parse the actual benefit, company, and
  performance HTTP responses with the shared contracts.
- Added API contract tests for monetary/ERP fields, company identity
  relationships, and required performance result-to-indicator relationships.
- Added reusable success, pagination, and error response contracts to
  `@workspace/api-zod`.
- Added a contract-validating React API client and migrated the CMS and budget
  operational reads to runtime response validation.
- Client errors now retain the server error code, request ID, field errors, and
  localized message instead of flattening the response to a generic failure.
- Server authorization failures use the same canonical error envelope, verified
  by dedicated API error serialization tests.
- Expanded FD_Set_01 HTTP coverage with a role matrix separating student,
  auditor, reviewer, content-editor, and system-administrator capabilities.
- Added `POST /api/v1/completion-assessments/derive`.
- The server now reads curriculum requirements, passed course completions,
  confirmed program completions, and verified experiential records instead of
  accepting those facts from the browser.
- The calculated inputs and DB rules are preserved in the assessment snapshot.
- Requirement comparison operators are evaluated from DB configuration.
- Eligible programs are derived from department/grade, progress, credits,
  prerequisite courses, application period, remaining capacity, and prior
  applications. The same evaluator is reused when an application is submitted.
- Pure aggregation and evaluator tests run without a database connection.
- Added course-master update/archive and business-year/term offering
  list/create/update/archive APIs.
- Academic changes use education RBAC, transactions, soft deletion, shared Zod
  contracts, and audit records.
- Added business-year curriculum list/create/update/publish/archive APIs and
  nested requirement list/create/update/archive APIs.
- Curriculum dates and requirement-type references are validated by the shared
  contract before persistence.
- Added education-staff administrator screens for course masters, offerings,
  curricula, requirements, and the JSON stage/validate/preview/commit workflow.
- Extended the FD_Set_01 adapter and tests so the complete academic preview can
  be exercised without a production database.
- Added course edit, curriculum publish, and academic archive controls, plus
  CSV/XLSX/JSON multipart upload controls that reuse preview and commit.
- Removed vulnerable SheetJS and ExcelJS dependency paths. XLSX imports now use
  `read-excel-file`, CSV uses `csv-parse`, and both enforce file, row, column,
  and header limits before staging.
- Added a session operations view covering selected participants, attendance
  events/records, assignments, surveys, and calculated completion confirmation.
- Added a consolidated operations read API, attendance-event creation contract,
  FD_Set_01 state transitions, and a preview integration test through completion.
- Added authenticated student learning reads with server-side own-student
  enforcement, assignment upsert submission, survey response, and staff grading.
- Added the student `과제·만족도` portal screen and submission/response counts
  plus grading action to the program operations screen.
- Extended FD_Set_01 with removable in-memory submission/response state and an
  integration scenario covering submission, response, impersonation rejection,
  grading, and student score re-query.
- Added consolidated benefit operations read for policies, rules, candidates,
  approvals, payments, and student references.
- Added a role-aware benefit administration screen for candidate review,
  calculated-amount approval, ERP payment request, and paid-status recording.
- Rejected decisions now require a zero amount; paid status requires an ERP
  reference and paid timestamp. Server processing also prevents approval or
  payment amounts from exceeding their calculation/approval source.
- Extended FD_Set_01 and integration tests through candidate approval, ERP
  request, paid status, and final reference-number retrieval.
- Added applicant-scoped and staff-scoped company application reads, protected
  supplement resubmission, and business-year commitment upsert with audit logs.
- Added applicant and administrator screens for supplement notices,
  resubmission, review requests, approval, approved-company creation, and
  commitment counts.
- Company managers can upload a signed PDF in database mode and register or
  replace the business-year commitment; FD_Set_01 uses a removable fake file
  reference for the same workflow.
- Extended FD_Set_01 integration coverage through supplement, resubmission,
  approval, company creation, and commitment registration.
- Added a business-year/program budget operations read returning allocation and
  execution details alongside the existing aggregate summary.
- Added budget-staff actions for allocation creation, execution entry, and
  reason-required amount changes; reviewer and auditor access remains read-only.
- Program budget cards now expose allocation, execution, balance, internal
  approval number, ERP reference, and RCMS reference.
- Allocation/plan cross-validation prevents planned amounts above allocation,
  allocation reductions below plan or execution, and executions above balance.
- Extended FD_Set_01 integration coverage through allocation, referenced
  execution with evidence, over-budget rejection, amount change, and history.
- Added performance-result evidence relationships and included those links in
  the business-year overview used by staff and reviewers.
- Performance results now move through explicit `DRAFT`, `IN_REVIEW`, and
  `PUBLISHED` states with separate staff submission and reviewer approval.
- Public approval requires at least one linked evidence file, and every link,
  review request, and approval creates an audit record.
- The result screen exposes evidence counts and role-specific link,
  review-request, and public-approval actions.
- Extended FD_Set_01 integration coverage through draft reset, evidence-less
  approval rejection, evidence linking, approval, and public API publication.
- Added an internal CMS list with attachment relationships for content editors,
  reviewers, auditors, and administrators.
- CMS transitions now enforce role separation: editors submit and publish,
  reviewers approve, and either role may archive within the allowed state.
- Approved content supports immediate or future publication timestamps; the
  public API excludes scheduled content until its publication time.
- Added a CMS screen covering notice, recruitment, news, performance case, and
  resource creation, attachment counts, review, approval, scheduling, and archive.
- Extended FD_Set_01 integration coverage through attachment creation, role
  denial checks, review approval, scheduled publication, and public invisibility.
- Added file relationship discovery across assignment submissions, budget
  executions, company commitments, CMS attachments, and performance evidence.
- Downloads are authorized from the authenticated user's role and related
  student/company ownership rather than from hidden frontend controls.
- File metadata lists, relationship reads, and downloads create audit records,
  including personal-information flags and related domain types.
- File archive is restricted to the uploader or system administrator and is
  blocked while any business-domain relationship remains; archive is a
  recoverable soft delete.
- Added evidence-screen relationship inspection and authenticated download
  controls, plus FD_Set_01 tests for allow/deny, in-use blocking, archive, and
  audit history.
- Completed shared runtime-contract coverage for every portal JSON query,
  including public curriculum/recruitment, budget change history, system
  readiness, stored performance files, and FD_Set_01 role operations.
- Added FD_Set_01 regression parsing for budget history and role-operation
  responses so preview fixtures cannot silently drift from the UI contract.

## External dependencies

- University OIDC issuer, client credentials, redirect/logout URLs, scopes,
  claim mapping, account-provisioning policy, and test identities.
- Production database, file storage, domain/TLS, mail, observability, and
  deployment target decisions.

## Remaining priority sequence

1. Define external handling and deletion procedures for exported audit files.
   Server-side audit filtering, masking, purpose-bound CSV export, Helmet
   headers, API rate limits, fail-closed malware scanning, DB-configured file
   retention, legal holds, and guarded two-phase purge are active.
2. Run migrations, seed, idempotent import, transactions, RBAC, and the scripted
   backup/restore rehearsal against a real PostgreSQL environment; record RPO,
   RTO, archive hash, role grants, and restored object-reference validation.
3. Select concrete monitoring, alert-notification, TLS, secrets-management, and
   production hosting providers. Structured redacted logs, protected Prometheus
   metrics, request IDs, baseline alert rules, S3-compatible storage, runtime
   containers, proxy configuration, readiness, graceful shutdown, file-mounted
   runtime secrets, automated production configuration checks, and portal CSP
   are ready. Provider credentials, final ingress/HSTS policy, and bucket policy
   remain external.
4. Implement university OIDC/SSO only after issuer, client, claim mapping,
   logout, provisioning, and test-account information is supplied.
