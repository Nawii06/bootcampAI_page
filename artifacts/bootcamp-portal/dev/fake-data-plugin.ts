import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

interface FakeIdentity {
  id: string;
  userId: string;
  loginId: string;
  displayName: string;
  roles: string[];
  studentId?: string;
  companyId?: string;
  departmentCode?: string;
  grade?: string;
  scenarioLabel: string;
  description: string;
  defaultRoute: string;
  isActive: boolean;
}

interface FakeDataSet {
  dataSetId: string;
  businessYears: unknown[];
  courses: unknown[];
  programs: unknown[];
  companies: unknown[];
  performanceResults: unknown[];
  content: Array<{ contentType: string }>;
  programApplications: Array<{ studentId: string } & Record<string, unknown>>;
  completionAssessments: Array<{ studentId: string } & Record<string, unknown>>;
  students: Array<Record<string, unknown>>;
  budgetSummary: Record<string, unknown>;
  budgetChangeHistory: unknown[];
  performanceOverview: Record<string, unknown>;
  storedFiles: unknown[];
  companyParticipations: Array<{ companyId: string } & Record<string, unknown>>;
  benefitAwards: unknown[];
  previewOperations: Record<string, unknown>;
  fakeAuth: {
    enabled: boolean;
    sessionCookieName: string;
    identities: FakeIdentity[];
  };
  auditLogs: Array<Record<string, unknown>>;
}

function sendJson(res: ServerResponse, dataSetId: string, body: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Fake-Data-Set", dataSetId);
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, dataSetId: string, status: number, code: string, message: string) {
  sendJson(res, dataSetId, { error: { code, message } }, status);
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function cookies(req: IncomingMessage) {
  return Object.fromEntries(
    (req.headers.cookie ?? "")
      .split(";")
      .map((value) => value.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value!)]),
  );
}

export function fakeDataPreviewPlugin(dataSetId?: string): Plugin {
  return {
    name: "bootcamp-fake-data-preview",
    apply: "serve",
    async configureServer(server) {
      if (!dataSetId) return;
      if (process.env.NODE_ENV === "production" || dataSetId !== "FD_Set_01") {
        throw new Error("Fake authentication preview is restricted to FD_Set_01 development mode.");
      }

      const fixturePath = path.resolve(import.meta.dirname, "..", "fake-data", `${dataSetId}.json`);
      const original = JSON.parse(await readFile(fixturePath, "utf8")) as FakeDataSet;
      let store = structuredClone(original);
      const loadedAt = new Date().toISOString();
      const signingKey = randomBytes(32);
      const cookieName = original.fakeAuth.sessionCookieName;
      const activeSessionTokens = new Set<string>();
      const now = new Date().toISOString();
      const fakeTerm = {
        id: "fd010000-0000-4000-8000-000000000011",
        businessYearId: (original.businessYears[0] as { id: string }).id,
        semester: "FIRST",
        name: "2026학년도 1학기",
        startsAt: "2026-03-02T00:00:00.000Z",
        endsAt: "2026-06-19T00:00:00.000Z",
      };
      let fakeOfferings: Array<Record<string, unknown>> = [];
      let fakeCurricula: Array<Record<string, unknown>> = [];
      let fakeRequirements: Array<Record<string, unknown>> = [];
      let fakeAttendanceEvents: Array<Record<string, unknown>> = [];
      let fakeAssignments: Array<Record<string, unknown>> = [];
      let fakeAssignmentSubmissions: Array<Record<string, unknown>> = [];
      let fakeSurveys: Array<Record<string, unknown>> = [];
      let fakeSurveyResponses: Array<Record<string, unknown>> = [];
      let fakeProgramCompletions: Array<Record<string, unknown>> = [];
      let fakeExperientialRecords: Array<Record<string, unknown>> = [];
      let fakeBenefitPolicies: Array<Record<string, unknown>> = [];
      let fakeBenefitRules: Array<Record<string, unknown>> = [];
      let fakeBenefitCandidates: Array<Record<string, unknown>> = [];
      let fakeBenefitApprovals: Array<Record<string, unknown>> = [];
      let fakeBenefitPayments: Array<Record<string, unknown>> = [];
      let fakeCompanyApplications: Array<Record<string, unknown>> = [];
      let fakeCompanyCommitments: Array<Record<string, unknown>> = [];
      let fakeCompanyContacts: Array<Record<string, unknown>> = [];
      let fakeCompanyExperts: Array<Record<string, unknown>> = [];
      let fakeBudgetAllocations: Array<Record<string, unknown>> = [];
      let fakeBudgetExecutions: Array<Record<string, unknown>> = [];
      let fakeBudgetHistory: Array<Record<string, unknown>> = [];
      let fakePerformanceOverview: {
        indicators: Array<Record<string, unknown>>;
        targets: Array<Record<string, unknown>>;
        results: Array<Record<string, unknown>>;
      };
      let fakePerformanceEvidence: Array<Record<string, unknown>> = [];
      let fakePerformanceReviews: Array<Record<string, unknown>> = [];
      let fakeContentItems: Array<Record<string, unknown>> = [];
      let fakeContentAttachments: Array<Record<string, unknown>> = [];
      let fakeContentVersions: Array<Record<string, unknown>> = [];
      const fakeImportJobs = new Map<string, Record<string, unknown>>();
      const resetAcademics = () => {
        fakeOfferings = original.courses.map((course, index) => {
          const value = course as { id: string; courseCode: string; name: string; defaultCredits: number };
          return {
            id: `fd010000-0000-4000-8b00-${String(index + 1).padStart(12, "0")}`,
            courseMasterId: value.id,
            businessYearId: fakeTerm.businessYearId,
            termId: fakeTerm.id,
            sectionCode: "01",
            credits: value.defaultCredits,
            capacity: 30,
            isActive: true,
            courseCode: value.courseCode,
            courseName: value.name,
            businessYearName: "2026학년도",
            termName: fakeTerm.name,
            createdAt: now,
            updatedAt: now,
          };
        });
        fakeCurricula = [{
          id: "fd010000-0000-4000-8b10-000000000001",
          businessYearId: fakeTerm.businessYearId,
          code: "AI-BOOT-2026",
          name: "AI 모빌리티 부트캠프 교육과정",
          version: 1,
          effectiveFrom: "2026-03-01T00:00:00.000Z",
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        }];
        fakeRequirements = [{
          id: "fd010000-0000-4000-8b20-000000000001",
          curriculumId: fakeCurricula[0]!.id,
          code: "TOTAL-CREDITS",
          name: "총 교과학점",
          requirementType: "TOTAL_CREDITS",
          operator: "GTE",
          requiredValue: 18,
          unit: "학점",
          conditions: {},
          sortOrder: 1,
          isRequired: true,
          createdAt: now,
          updatedAt: now,
        }];
        fakeImportJobs.clear();
        fakeAttendanceEvents = [];
        fakeAssignments = [];
        fakeAssignmentSubmissions = [];
        fakeSurveys = [];
        fakeSurveyResponses = [];
        fakeProgramCompletions = [];
        fakeExperientialRecords = [];
        fakePerformanceReviews = [];
        fakeBenefitPolicies = [{
          id: "fd010000-0000-4000-8400-000000000001",
          businessYearId: fakeTerm.businessYearId,
          code: "FD_ACADEMIC_SUPPORT",
          name: "학업장려 수혜제도",
          benefitType: "SCHOLARSHIP",
          amountFormula: { type: "FIXED", amount: 1200000 },
          status: "OPEN",
          effectiveFrom: "2026-03-01T00:00:00.000Z",
        }];
        fakeBenefitRules = [{
          id: "fd010000-0000-4000-8401-000000000001",
          policyId: fakeBenefitPolicies[0]!.id,
          code: "COMPLETION",
          name: "교육과정 이수요건",
          expression: { fact: "progressRate", operator: "GTE", value: 80 },
          sortOrder: "1",
        }];
        fakeBenefitCandidates = original.benefitAwards.map((award) => {
          const row = award as Record<string, unknown>;
          return {
            id: row.id,
            policyId: fakeBenefitPolicies[0]!.id,
            studentId: row.studentId,
            eligibilitySnapshot: { fakeDataSetId: original.dataSetId, eligible: row.eligibilityStatus !== "REVIEW_REQUIRED" },
            calculatedAmount: row.approvedAmount || 1200000,
            status: row.eligibilityStatus === "REVIEW_REQUIRED" ? "REVIEWING" : "APPROVED",
            calculatedAt: now,
          };
        });
        fakeBenefitApprovals = [{
          id: "fd010000-0000-4000-8500-000000000002",
          candidateId: fakeBenefitCandidates[1]!.id,
          approvedAmount: 1200000,
          decision: "APPROVED",
          note: "FD_Set_01 기승인",
          snapshot: { fakeDataSetId: original.dataSetId },
          approvedAt: now,
        }];
        fakeBenefitPayments = [{
          id: "fd010000-0000-4000-8600-000000000002",
          approvalId: fakeBenefitApprovals[0]!.id,
          amount: 1200000,
          status: "PAID",
          erpReference: "FAKE-ERP-2026-001",
          paidAt: now,
          updatedAt: now,
        }];
        const applicantIdentity = original.fakeAuth.identities.find((identity) => identity.roles.includes("COMPANY_APPLICANT"));
        const previewCompanyApplications = (original.previewOperations.companyApplications ?? []) as Array<Record<string, unknown>>;
        fakeCompanyApplications = previewCompanyApplications.map((row, index) => ({
          ...row,
          businessYearId: fakeTerm.businessYearId,
          applicantUserId: applicantIdentity?.userId,
          registrationNumber: `FAKE-BIZ-APP-${index + 1}`,
          applicationData: {
            businessYearId: fakeTerm.businessYearId,
            companyName: row.companyName,
            registrationNumber: `FAKE-BIZ-APP-${index + 1}`,
            companyType: "중소기업",
            description: "FD_Set_01 참여기업 신청",
            website: "https://example.invalid",
            contact: { name: "가상 신청담당자", email: "applicant@example.invalid" },
            participationTypes: ["PROJECT", "INTERNSHIP"],
          },
          supplementRequest: row.status === "SUPPLEMENT_REQUESTED" ? row.note : null,
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        }));
        fakeCompanyCommitments = [];
        fakeCompanyContacts = original.companies.map((company, index) => ({
          id: `fd010000-0000-4000-8d10-${String(index + 1).padStart(12, "0")}`,
          companyId: (company as { id: string }).id,
          name: "가상기업담당자",
          email: "company.manager@example.invalid",
          isPrimary: true,
        }));
        fakeCompanyExperts = original.companies.map((company, index) => ({
          id: `fd010000-0000-4000-8d20-${String(index + 1).padStart(12, "0")}`,
          companyId: (company as { id: string }).id,
          name: `가상기업전문가${index + 1}`,
          specialty: "AI 프로젝트",
          profile: {},
          isActive: true,
        }));
        fakeBudgetAllocations = [{
          id: "fd010000-0000-4000-8700-000000000001",
          businessYearId: fakeTerm.businessYearId,
          programId: (original.programs[0] as { id: string }).id,
          programName: (original.programs[0] as { name: string }).name,
          budgetCode: "2026-PBL-01",
          category: "프로그램 운영비",
          allocatedAmount: 450000000,
          plannedAmount: 420000000,
          internalApprovalNumber: "FAKE-IA-2026-001",
          erpReference: "FAKE-ERP-BUDGET-001",
          rcmsReference: "FAKE-RCMS-001",
        }];
        fakeBudgetExecutions = [{
          id: "fd010000-0000-4000-8701-000000000001",
          allocationId: fakeBudgetAllocations[0]!.id,
          amount: 268500000,
          purpose: "FD_Set_01 누적 프로그램 집행",
          executedAt: now,
          evidenceFileId: (original.storedFiles[0] as { id: string }).id,
          internalApprovalNumber: "FAKE-IA-EXEC-001",
          erpReference: "FAKE-ERP-EXEC-001",
          rcmsReference: "FAKE-RCMS-EXEC-001",
        }];
        fakeBudgetHistory = structuredClone(original.budgetChangeHistory) as Array<Record<string, unknown>>;
        fakePerformanceOverview = structuredClone(original.performanceOverview) as typeof fakePerformanceOverview;
        const performanceFormulas = [
          { type: "COUNT", source: "STUDENTS" },
          { type: "COUNT", source: "COMPANIES" },
          { type: "RATE", numerator: "EXPERIENTIAL_RECORDS", denominator: "STUDENTS", multiplier: 100, precision: 2 },
        ];
        fakePerformanceOverview.indicators = fakePerformanceOverview.indicators.map((row, index) => ({
          ...row,
          calculationFormula: performanceFormulas[index] ?? { type: "COUNT", source: "STUDENTS" },
        }));
        fakePerformanceOverview.results = fakePerformanceOverview.results.map((row) => ({
          calculationSnapshot: { fakeDataSetId: original.dataSetId, source: "FD_Set_01" },
          createdAt: now,
          updatedAt: now,
          ...row,
          publicApprovedAt: row.status === "PUBLISHED" ? now : null,
        }));
        fakePerformanceEvidence = [{
          id: "fd010000-0000-4000-8730-000000000001",
          resultId: fakePerformanceOverview.results[0]!.id,
          fileId: (original.storedFiles[0] as { id: string }).id,
          description: "FD_Set_01 성과 산정 증빙",
          createdAt: now,
        }];
        const contentEditor = original.fakeAuth.identities.find((identity) => identity.roles.includes("CONTENT_EDITOR"));
        fakeContentItems = original.content.map((row, index) => ({
          ...(row as object),
          slug: `fd-public-${index + 1}`,
          status: "PUBLISHED",
          isPinned: false,
          authorId: contentEditor?.userId,
          createdAt: now,
          updatedAt: now,
        }));
        const workflowItems = (original.previewOperations.contentWorkflow ?? []) as Array<Record<string, unknown>>;
        fakeContentItems.push(...workflowItems.map((row, index) => ({
          ...row,
          contentType: row.contentType === "CASE_STUDY" ? "PERFORMANCE_CASE" : row.contentType === "BENEFIT_GUIDE" ? "NOTICE" : row.contentType,
          slug: `fd-workflow-${index + 1}`,
          summary: "FD_Set_01 CMS Workflow",
          body: "가상 콘텐츠 본문입니다.",
          metadata: { fakeDataSetId: original.dataSetId },
          isPinned: false,
          authorId: contentEditor?.userId,
          createdAt: now,
          updatedAt: now,
          publishedAt: row.status === "PUBLISHED" ? now : null,
        })));
        fakeContentAttachments = [];
        fakeContentVersions = fakeContentItems.map((item) => ({
          id: randomUUID(),
          contentId: item.id,
          version: 1,
          snapshot: { ...item, attachmentFileIds: [] },
          changeSummary: "FD_Set_01 초기 버전",
          createdBy: original.fakeAuth.identities.find((identity) => identity.roles.includes("CONTENT_EDITOR"))?.userId,
          createdAt: item.createdAt,
        }));
      };
      resetAcademics();

      const sign = (identityId: string) => {
        const signature = createHmac("sha256", signingKey).update(identityId).digest("base64url");
        return `${identityId}.${signature}`;
      };
      const identityFromRequest = (req: IncomingMessage) => {
        const value = cookies(req)[cookieName];
        if (!value || !activeSessionTokens.has(value)) return undefined;
        const [identityId, signature] = value.split(".");
        if (!identityId || !signature) return undefined;
        const expected = sign(identityId).split(".")[1]!;
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
        return store.fakeAuth.identities.find((item) => item.id === identityId && item.isActive);
      };
      const sessionBody = (identity: FakeIdentity) => ({
        user: {
          id: identity.userId,
          loginId: identity.loginId,
          displayName: identity.displayName,
          roles: identity.roles,
          studentId: identity.studentId,
          companyId: identity.companyId,
          departmentCode: identity.departmentCode,
          grade: identity.grade,
          defaultRoute: identity.defaultRoute,
          isFakeSession: true,
          fakeDataSetId: store.dataSetId,
        },
      });
      const recordAudit = (
        identity: FakeIdentity | undefined,
        action: string,
        entityType: string,
        entityId?: string,
        before?: unknown,
        after?: unknown,
      ) => {
        store.auditLogs.push({
          id: randomUUID(),
          actorIdentityId: identity?.id ?? null,
          actorDisplayName: identity?.displayName ?? "anonymous",
          roles: identity?.roles ?? [],
          action,
          entityType,
          entityId: entityId ?? null,
          occurredAt: new Date().toISOString(),
          before: before ?? null,
          after: after ?? null,
          fakeDataSetId: store.dataSetId,
        });
      };
      const fakeFileRelations = (fileId: string) => [
        ...fakeAssignmentSubmissions.filter((row) => row.fileId === fileId).map((row) => ({ relationType: "ASSIGNMENT_SUBMISSION", relationId: row.id, ownerStudentId: row.studentId })),
        ...fakeBudgetExecutions.filter((row) => row.evidenceFileId === fileId).map((row) => ({ relationType: "BUDGET_EXECUTION", relationId: row.id })),
        ...fakeCompanyCommitments.filter((row) => row.fileId === fileId).map((row) => ({ relationType: "COMPANY_COMMITMENT", relationId: row.id, ownerCompanyId: row.companyId })),
        ...fakeContentAttachments.filter((row) => row.fileId === fileId).map((row) => ({ relationType: "CONTENT_ATTACHMENT", relationId: row.id })),
        ...fakePerformanceEvidence.filter((row) => row.fileId === fileId).map((row) => ({ relationType: "PERFORMANCE_EVIDENCE", relationId: row.id })),
      ];
      const fakeCanReadFile = (identity: FakeIdentity, relations: Array<Record<string, unknown>>) => {
        if (identity.roles.some((role) => ["SYSTEM_ADMIN", "AUDITOR"].includes(role))) return true;
        if (relations.some((row) => row.relationType === "BUDGET_EXECUTION") && identity.roles.some((role) => ["BUDGET_STAFF", "REVIEWER"].includes(role))) return true;
        if (relations.some((row) => row.relationType === "PERFORMANCE_EVIDENCE") && identity.roles.some((role) => ["PERFORMANCE_STAFF", "REVIEWER"].includes(role))) return true;
        if (relations.some((row) => row.relationType === "CONTENT_ATTACHMENT") && identity.roles.some((role) => ["CONTENT_EDITOR", "REVIEWER"].includes(role))) return true;
        if (relations.some((row) => row.relationType === "COMPANY_COMMITMENT") && (identity.roles.some((role) => ["COMPANY_STAFF", "REVIEWER"].includes(role)) || relations.some((row) => row.ownerCompanyId === identity.companyId))) return true;
        if (relations.some((row) => row.relationType === "ASSIGNMENT_SUBMISSION") && (identity.roles.some((role) => ["EDUCATION_STAFF", "REVIEWER"].includes(role)) || relations.some((row) => row.ownerStudentId === identity.studentId))) return true;
        return false;
      };

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const url = new URL(req.url, "http://127.0.0.1");
        try {
          if (url.pathname === "/api/v1/fake-auth/identities" && req.method === "GET") {
            return sendJson(res, store.dataSetId, {
              data: store.fakeAuth.identities.filter((item) => item.isActive).map((item) => ({
                identityId: item.id,
                displayName: item.displayName,
                roles: item.roles,
                scenarioLabel: item.scenarioLabel,
                description: item.description,
                defaultRoute: item.defaultRoute,
              })),
            });
          }
          if (url.pathname === "/api/v1/fake-auth/login" && req.method === "POST") {
            const body = (await readBody(req)) as { identityId?: string };
            const identity = store.fakeAuth.identities.find((item) => item.id === body.identityId);
            if (!identity?.isActive) {
              return sendError(res, store.dataSetId, 401, "FAKE_IDENTITY_INVALID", "활성화된 가상 계정을 찾을 수 없습니다.");
            }
            recordAudit(identity, "LOGIN", "FAKE_SESSION", identity.id);
            const sessionToken = sign(identity.id);
            activeSessionTokens.add(sessionToken);
            res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(sessionToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
            return sendJson(res, store.dataSetId, { ...sessionBody(identity), defaultRoute: identity.defaultRoute });
          }
          if (url.pathname === "/api/v1/session" && req.method === "GET") {
            const identity = identityFromRequest(req);
            return identity
              ? sendJson(res, store.dataSetId, sessionBody(identity))
              : sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
          }
          if ((url.pathname === "/api/v1/fake-auth/logout" || url.pathname === "/api/v1/session/logout") && req.method === "POST") {
            recordAudit(identityFromRequest(req), "LOGOUT", "FAKE_SESSION");
            const sessionToken = cookies(req)[cookieName];
            if (sessionToken) activeSessionTokens.delete(sessionToken);
            res.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
            res.statusCode = 204;
            return res.end();
          }
          if (url.pathname === "/api/v1/fake-data/status" && req.method === "GET") {
            const identity = identityFromRequest(req);
            return sendJson(res, store.dataSetId, {
              dataSetId: store.dataSetId,
              enabled: true,
              loadedAt,
              activeFakeIdentity: identity?.displayName ?? null,
              mutablePreview: true,
              productionDisabled: true,
            });
          }
          if (url.pathname === "/api/v1/fake-data/reset" && req.method === "POST") {
            const identity = identityFromRequest(req);
            if (!identity?.roles.includes("SYSTEM_ADMIN")) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "시스템 관리자만 초기화할 수 있습니다.");
            }
            store = structuredClone(original);
            resetAcademics();
            recordAudit(identity, "RESET", "FAKE_DATA_SET", store.dataSetId);
            return sendJson(res, store.dataSetId, { reset: true });
          }
          const activeIdentity = identityFromRequest(req);
          if (
            url.pathname === "/api/v1/audit-logs" &&
            req.method === "GET"
          ) {
            if (!activeIdentity?.roles.some((role) => ["AUDITOR", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "감사로그 조회 권한이 없습니다.");
            }
            const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
            const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? 50)));
            const action = url.searchParams.get("action");
            const resourceType = url.searchParams.get("resourceType");
            const startAt = url.searchParams.get("startAt");
            const endAt = url.searchParams.get("endAt");
            const filtered = store.auditLogs
              .filter((row) => !action || row.action === action)
              .filter((row) => !resourceType || row.entityType === resourceType)
              .filter((row) => !startAt || String(row.occurredAt) >= startAt)
              .filter((row) => !endAt || String(row.occurredAt) <= endAt)
              .slice()
              .reverse();
            const data = filtered
              .slice((page - 1) * pageSize, page * pageSize)
              .map((row) => ({
                id: row.id,
                actorUserId: row.actorIdentityId ?? null,
                actorDisplayName: row.actorDisplayName ?? null,
                actorRole: Array.isArray(row.roles) ? row.roles[0] ?? null : null,
                action: row.action,
                resourceType: row.entityType,
                resourceId: row.entityId ?? null,
                requestId: `fake-${row.id}`,
                reason: null,
                changedFields: [],
                before: row.before && typeof row.before === "object" ? row.before : null,
                after: row.after && typeof row.after === "object" ? row.after : null,
                metadata: { fakeDataSetId: store.dataSetId },
                ipAddress: null,
                userAgent: null,
                occurredAt: row.occurredAt,
              }));
            recordAudit(activeIdentity, "LIST", "AUDIT_LOG");
            return sendJson(res, store.dataSetId, {
              data,
              meta: { page, pageSize, total: filtered.length },
            });
          }
          if (
            url.pathname === "/api/v1/audit-logs/export" &&
            req.method === "POST"
          ) {
            if (!activeIdentity?.roles.some((role) => ["AUDITOR", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "감사로그 내보내기 권한이 없습니다.");
            }
            const body = await readBody(req) as { purpose?: string };
            if (!body.purpose || body.purpose.trim().length < 5) {
              return sendError(res, store.dataSetId, 400, "VALIDATION_ERROR", "내보내기 목적은 5자 이상이어야 합니다.");
            }
            recordAudit(activeIdentity, "EXPORT", "AUDIT_LOG", undefined, undefined, {
              purpose: body.purpose,
              resultCount: store.auditLogs.length,
            });
            const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
            const rows = store.auditLogs
              .slice()
              .reverse()
              .map((row) => [
                row.occurredAt,
                row.actorDisplayName,
                row.action,
                row.entityType,
                row.entityId,
              ].map(escape).join(","));
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="audit-logs-FD_Set_01.csv"');
            return res.end(`\uFEFF"occurredAt","actorDisplayName","action","resourceType","resourceId"\r\n${rows.join("\r\n")}`);
          }
          if (
            activeIdentity?.roles.includes("AUDITOR") &&
            !["GET", "HEAD", "OPTIONS"].includes(req.method ?? "GET")
          ) {
            recordAudit(activeIdentity, "ACCESS_DENIED", "HTTP_REQUEST", url.pathname, undefined, { method: req.method });
            return sendError(res, store.dataSetId, 403, "AUDITOR_READ_ONLY", "감사자는 조회만 할 수 있습니다.");
          }
          if (url.pathname === "/api/v1/fake-data/operations" && req.method === "GET") {
            if (!activeIdentity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            return sendJson(res, store.dataSetId, {
              dataSetId: store.dataSetId,
              role: activeIdentity.roles[0],
              operations: store.previewOperations,
              benefitAwards: store.benefitAwards,
              auditLogs: store.auditLogs.slice(-50).reverse(),
            });
          }
          if (url.pathname === "/api/v1/benefit-operations" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["BENEFIT_STAFF", "REVIEWER", "AUDITOR", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "수혜업무 조회 권한이 없습니다.");
            }
            const businessYearId = url.searchParams.get("businessYearId");
            const policies = businessYearId
              ? fakeBenefitPolicies.filter((row) => row.businessYearId === businessYearId)
              : fakeBenefitPolicies;
            const policyIds = new Set(policies.map((row) => row.id));
            const candidates = fakeBenefitCandidates.filter((row) => policyIds.has(row.policyId));
            const candidateIds = new Set(candidates.map((row) => row.id));
            const approvals = fakeBenefitApprovals.filter((row) => candidateIds.has(row.candidateId));
            const approvalIds = new Set(approvals.map((row) => row.id));
            return sendJson(res, store.dataSetId, {
              policies,
              rules: fakeBenefitRules.filter((row) => policyIds.has(row.policyId)),
              candidates,
              approvals,
              payments: fakeBenefitPayments.filter((row) => approvalIds.has(row.approvalId)),
              students: store.students,
            });
          }
          if (url.pathname === "/api/v1/benefit-candidates/bulk-calculate" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["BENEFIT_STAFF", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "수혜 대상자 일괄 산정 권한이 없습니다.");
            }
            const body = await readBody(req) as {
              policyId?: string;
              studentIds?: string[];
              dryRun?: boolean;
            };
            const policy = fakeBenefitPolicies.find(
              (row) => row.id === body.policyId && row.status === "OPEN",
            );
            if (!policy) {
              return sendError(res, store.dataSetId, 404, "ACTIVE_POLICY_NOT_FOUND", "시행 중인 수혜정책을 찾을 수 없습니다.");
            }
            const selectedStudents = store.students.filter(
              (student) => !body.studentIds || body.studentIds.includes(String(student.id)),
            );
            const dryRun = body.dryRun ?? true;
            if (selectedStudents.length > 500) {
              return sendError(res, store.dataSetId, 422, "BENEFIT_BULK_LIMIT_EXCEEDED", "일괄 산정은 한 번에 최대 500명까지 처리할 수 있습니다.");
            }
            const rules = fakeBenefitRules.filter((rule) => rule.policyId === policy.id);
            const calculationVersion = "benefit-facts-v1";
            const bulkRunId = randomUUID();
            const calculatedAt = new Date().toISOString();
            let committed = 0;
            const results = selectedStudents.map((student) => {
              const assessment = store.completionAssessments.find(
                (row) => row.studentId === student.id,
              );
              const facts: Record<string, number | string | string[]> = {
                departmentCode: String(student.departmentCode ?? ""),
                grade: Number(student.grade ?? 0),
                totalCredits: 0,
                passedCourseCount: 0,
                completedProgramCount: 0,
                experientialHours: 0,
                progressRate: Number(assessment?.progressRate ?? 0),
              };
              const ruleResults = rules.map((rule) => {
                const expression = rule.expression as {
                  fact: string;
                  operator: "GTE" | "LTE" | "EQ" | "IN";
                  value: number | string | string[];
                };
                const actual = facts[expression.fact];
                const satisfied =
                  expression.operator === "GTE" ? Number(actual) >= Number(expression.value) :
                  expression.operator === "LTE" ? Number(actual) <= Number(expression.value) :
                  expression.operator === "IN" ? Array.isArray(expression.value) && expression.value.includes(String(actual)) :
                  actual === expression.value;
                return { code: String(rule.code), satisfied };
              });
              const eligible = ruleResults.every((result) => result.satisfied);
              const formula = policy.amountFormula as {
                type: "FIXED" | "MULTIPLY" | "TIERED";
                amount?: number;
                fact?: string;
                rate?: number;
                maximumAmount?: number;
                tiers?: Array<{ minimum: number; amount: number }>;
              };
              let calculatedAmount = 0;
              if (eligible && formula.type === "FIXED") calculatedAmount = Number(formula.amount ?? 0);
              if (eligible && formula.type === "MULTIPLY") {
                calculatedAmount = Number(facts[formula.fact ?? ""] ?? 0) * Number(formula.rate ?? 0);
                if (formula.maximumAmount !== undefined) calculatedAmount = Math.min(calculatedAmount, formula.maximumAmount);
              }
              if (eligible && formula.type === "TIERED") {
                const actual = Number(facts[formula.fact ?? ""] ?? 0);
                calculatedAmount = [...(formula.tiers ?? [])]
                  .sort((a, b) => b.minimum - a.minimum)
                  .find((tier) => actual >= tier.minimum)?.amount ?? 0;
              }
              const existingIndex = fakeBenefitCandidates.findIndex(
                (candidate) => candidate.policyId === policy.id && candidate.studentId === student.id,
              );
              const existing = existingIndex >= 0 ? fakeBenefitCandidates[existingIndex] : undefined;
              const decided = existing
                ? fakeBenefitApprovals.some((approval) => approval.candidateId === existing.id)
                : false;
              if (!dryRun && !decided) {
                const candidate = {
                  id: existing?.id ?? randomUUID(),
                  policyId: policy.id,
                  studentId: student.id,
                  eligibilitySnapshot: {
                    calculationVersion,
                    bulkRunId,
                    calculatedAt,
                    source: "DATABASE",
                    facts,
                    ruleResults,
                    eligible,
                    fakeDataSetId: store.dataSetId,
                  },
                  calculatedAmount,
                  status: eligible ? "REVIEWING" : "REJECTED",
                  calculatedAt,
                };
                if (existingIndex >= 0) fakeBenefitCandidates[existingIndex] = candidate;
                else fakeBenefitCandidates.push(candidate);
                committed += 1;
              }
              return {
                studentId: String(student.id),
                eligible,
                calculatedAmount,
                skippedReason: decided ? "DECIDED" as const : null,
                facts,
                ruleResults,
              };
            });
            if (!dryRun) {
              recordAudit(activeIdentity, "BULK_CALCULATE", "BENEFIT_POLICY", String(policy.id), undefined, {
                bulkRunId,
                calculationVersion,
                evaluated: results.length,
                committed,
                skippedDecided: results.filter((row) => row.skippedReason).length,
              });
            }
            return sendJson(res, store.dataSetId, {
              policyId: policy.id,
              dryRun,
              evaluated: results.length,
              eligible: results.filter((row) => row.eligible).length,
              ineligible: results.filter((row) => !row.eligible).length,
              committed,
              skippedDecided: results.filter((row) => row.skippedReason).length,
              calculationVersion,
              calculatedAt,
              results,
            });
          }
          const benefitPolicyStatusMatch = url.pathname.match(
            /^\/api\/v1\/benefit-policies\/([0-9a-f-]+)\/status$/,
          );
          if (benefitPolicyStatusMatch && req.method === "PATCH") {
            if (!activeIdentity?.roles.some((role) => ["BENEFIT_STAFF", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "수혜정책 상태변경 권한이 없습니다.");
            }
            const body = await readBody(req) as { status?: string; reason?: string };
            if (!body.reason || body.reason.trim().length < 5) {
              return sendError(res, store.dataSetId, 400, "VALIDATION_ERROR", "상태변경 사유는 5자 이상이어야 합니다.");
            }
            const index = fakeBenefitPolicies.findIndex(
              (row) => row.id === benefitPolicyStatusMatch[1],
            );
            if (index < 0) {
              return sendError(res, store.dataSetId, 404, "BENEFIT_POLICY_NOT_FOUND", "수혜정책을 찾을 수 없습니다.");
            }
            const current = fakeBenefitPolicies[index]!;
            const transitions: Record<string, string[]> = {
              DRAFT: ["OPEN", "ARCHIVED"],
              OPEN: ["CLOSED"],
              CLOSED: ["ARCHIVED"],
              ARCHIVED: [],
            };
            if (!transitions[String(current.status)]?.includes(String(body.status))) {
              return sendError(res, store.dataSetId, 409, "BENEFIT_POLICY_STATUS_TRANSITION_INVALID", "허용되지 않는 수혜정책 상태변경입니다.");
            }
            const updated = {
              ...current,
              status: body.status,
              updatedAt: new Date().toISOString(),
            };
            fakeBenefitPolicies[index] = updated;
            recordAudit(
              activeIdentity,
              "STATUS_CHANGE",
              "BENEFIT_POLICY",
              String(updated.id),
              { status: current.status },
              { status: updated.status, reason: body.reason },
            );
            return sendJson(res, store.dataSetId, updated);
          }
          if (url.pathname === "/api/v1/benefit-approvals" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["BENEFIT_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "수혜 승인 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const candidateIndex = fakeBenefitCandidates.findIndex((row) => row.id === body.candidateId);
            if (candidateIndex < 0) return sendError(res, store.dataSetId, 404, "CANDIDATE_NOT_FOUND", "수혜 대상자를 찾을 수 없습니다.");
            const candidate = fakeBenefitCandidates[candidateIndex]!;
            const approval = {
              ...body,
              id: randomUUID(),
              snapshot: { candidateCalculation: candidate.eligibilitySnapshot, calculatedAmount: candidate.calculatedAmount, fakeDataSetId: store.dataSetId },
              approvedBy: activeIdentity.userId,
              approvedAt: new Date().toISOString(),
            };
            fakeBenefitApprovals.push(approval);
            fakeBenefitCandidates[candidateIndex] = { ...candidate, status: body.decision === "APPROVED" ? "APPROVED" : "REJECTED" };
            recordAudit(activeIdentity, String(body.decision), "BENEFIT_APPROVAL", String(approval.id), undefined, approval);
            return sendJson(res, store.dataSetId, approval, 201);
          }
          if (url.pathname === "/api/v1/benefit-payments" && req.method === "PUT") {
            if (!activeIdentity?.roles.some((role) => ["BENEFIT_STAFF", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "수혜 지급상태 변경 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            if (!fakeBenefitApprovals.some((row) => row.id === body.approvalId && row.decision === "APPROVED")) {
              return sendError(res, store.dataSetId, 404, "APPROVAL_NOT_FOUND", "승인정보를 찾을 수 없습니다.");
            }
            const previous = fakeBenefitPayments.find((row) => row.approvalId === body.approvalId);
            const payment = {
              ...previous,
              ...body,
              id: previous?.id ?? randomUUID(),
              requestedAt: body.status === "REQUESTED" ? new Date().toISOString() : previous?.requestedAt,
              updatedAt: new Date().toISOString(),
            };
            fakeBenefitPayments = fakeBenefitPayments.filter((row) => row.approvalId !== body.approvalId);
            fakeBenefitPayments.push(payment);
            recordAudit(activeIdentity, "UPDATE_PAYMENT_STATUS", "BENEFIT_PAYMENT", String(payment.id), previous, payment);
            return sendJson(res, store.dataSetId, payment);
          }
          if (url.pathname === "/api/v1/company-applications" && req.method === "GET") {
            if (!activeIdentity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            const isApplicant = activeIdentity.roles.some((role) => ["COMPANY_APPLICANT", "COMPANY_MANAGER"].includes(role));
            const canReview = activeIdentity.roles.some((role) => ["COMPANY_STAFF", "REVIEWER", "AUDITOR", "SYSTEM_ADMIN"].includes(role));
            if (!isApplicant && !canReview) return sendError(res, store.dataSetId, 403, "FORBIDDEN", "기업신청 조회 권한이 없습니다.");
            const data = fakeCompanyApplications.filter((row) =>
              (!isApplicant || row.applicantUserId === activeIdentity.userId) &&
              (!url.searchParams.get("status") || row.status === url.searchParams.get("status")) &&
              (!url.searchParams.get("businessYearId") || row.businessYearId === url.searchParams.get("businessYearId"))
            );
            return sendJson(res, store.dataSetId, { data, commitments: canReview ? fakeCompanyCommitments : [] });
          }
          if (url.pathname === "/api/v1/company-applications" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_APPLICANT", "COMPANY_MANAGER"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업신청 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const application = {
              id: randomUUID(), ...body, applicantUserId: activeIdentity.userId,
              applicationData: body, status: "SUBMITTED",
              supplementRequest: null, submittedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            fakeCompanyApplications.push(application);
            recordAudit(activeIdentity, "SUBMIT", "COMPANY_APPLICATION", String(application.id), undefined, application);
            return sendJson(res, store.dataSetId, application, 201);
          }
          const companyApplicationMatch = url.pathname.match(/^\/api\/v1\/company-applications\/([^/]+)$/);
          if (companyApplicationMatch && req.method === "PUT") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_APPLICANT", "COMPANY_MANAGER"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업신청 보완 권한이 없습니다.");
            }
            const index = fakeCompanyApplications.findIndex((row) => row.id === companyApplicationMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COMPANY_APPLICATION_NOT_FOUND", "기업 신청서를 찾을 수 없습니다.");
            const before = fakeCompanyApplications[index]!;
            if (before.applicantUserId !== activeIdentity.userId) return sendError(res, store.dataSetId, 403, "FORBIDDEN", "본인의 기업 신청서만 수정할 수 있습니다.");
            if (!["DRAFT", "SUPPLEMENT_REQUESTED"].includes(String(before.status))) return sendError(res, store.dataSetId, 409, "COMPANY_APPLICATION_NOT_EDITABLE", "보완 가능한 신청서가 아닙니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const updated = { ...before, ...body, applicationData: body, status: "SUBMITTED", supplementRequest: null, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            fakeCompanyApplications[index] = updated;
            recordAudit(activeIdentity, "RESUBMIT", "COMPANY_APPLICATION", String(updated.id), before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          const companyDecisionMatch = url.pathname.match(/^\/api\/v1\/company-applications\/([^/]+)\/decision$/);
          if (companyDecisionMatch && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업신청 검토 권한이 없습니다.");
            }
            const index = fakeCompanyApplications.findIndex((row) => row.id === companyDecisionMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COMPANY_APPLICATION_NOT_FOUND", "기업 신청서를 찾을 수 없습니다.");
            const before = fakeCompanyApplications[index]!;
            if (!["SUBMITTED", "REVIEWING", "SUPPLEMENT_REQUESTED"].includes(String(before.status))) return sendError(res, store.dataSetId, 409, "COMPANY_APPLICATION_FINALIZED", "이미 처리가 완료된 신청입니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const updated = {
              ...before, status: body.decision,
              supplementRequest: body.decision === "SUPPLEMENT_REQUESTED" ? body.note : null,
              reviewedBy: activeIdentity.userId, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            fakeCompanyApplications[index] = updated;
            let company: Record<string, unknown> | undefined;
            if (body.decision === "APPROVED") {
              const data = before.applicationData as Record<string, unknown>;
              company = {
                id: randomUUID(), approvedApplicationId: before.id,
                name: data.companyName, registrationNumber: data.registrationNumber,
                companyType: data.companyType, description: data.description,
                website: data.website, isPublic: false, isActive: true,
              };
              store.companies.push(company);
            }
            recordAudit(activeIdentity, String(body.decision), "COMPANY_APPLICATION", String(updated.id), before, updated);
            return sendJson(res, store.dataSetId, { application: updated, company });
          }
          if (url.pathname === "/api/v1/company-commitments" && req.method === "POST") {
            if (!activeIdentity?.roles.includes("COMPANY_MANAGER") || !activeIdentity.companyId) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "승인된 기업 담당자만 확약서를 등록할 수 있습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const previous = fakeCompanyCommitments.find((row) => row.companyId === activeIdentity.companyId && row.businessYearId === body.businessYearId);
            const commitment = { ...previous, ...body, id: previous?.id ?? randomUUID(), companyId: activeIdentity.companyId };
            fakeCompanyCommitments = fakeCompanyCommitments.filter((row) => row.id !== commitment.id);
            fakeCompanyCommitments.push(commitment);
            recordAudit(activeIdentity, "UPSERT", "COMPANY_COMMITMENT", String(commitment.id), previous, commitment);
            return sendJson(res, store.dataSetId, commitment, 201);
          }
          if (url.pathname === "/api/v1/program-applications" && req.method === "GET") {
            const identity = activeIdentity;
            if (!identity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            const requestedStudentId = url.searchParams.get("studentId");
            if (identity.roles.includes("STUDENT") && requestedStudentId !== identity.studentId) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "본인의 신청정보만 조회할 수 있습니다.");
            }
            if (
              !identity.roles.includes("STUDENT") &&
              !identity.roles.some((role) => ["EDUCATION_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role))
            ) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "신청정보 조회 권한이 없습니다.");
            }
            const data = requestedStudentId
              ? store.programApplications.filter((item) => item.studentId === requestedStudentId)
              : store.programApplications;
            return sendJson(res, store.dataSetId, { data });
          }
          if (url.pathname === "/api/v1/program-applications" && req.method === "POST") {
            if (!activeIdentity?.roles.includes("STUDENT") || !activeIdentity.studentId) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학생 프로그램 신청 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            if (body.studentId !== activeIdentity.studentId) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "본인의 프로그램만 신청할 수 있습니다.");
            }
            const program = store.programs.find((item) =>
              ((item as Record<string, unknown>).programSessions as Array<Record<string, unknown>> | undefined)
                ?.some((session) => session.id === body.sessionId),
            ) as Record<string, unknown> | undefined;
            const session = (program?.programSessions as Array<Record<string, unknown>> | undefined)
              ?.find((item) => item.id === body.sessionId);
            if (!program || !session || session.status !== "OPEN") {
              return sendError(res, store.dataSetId, 409, "PROGRAM_SESSION_NOT_OPEN", "신청 가능한 프로그램 회차가 아닙니다.");
            }
            if (store.programApplications.some((row) =>
              row.studentId === activeIdentity.studentId &&
              row.sessionId === body.sessionId &&
              !["REJECTED", "CANCELLED"].includes(String(row.status)),
            )) {
              return sendError(res, store.dataSetId, 409, "DUPLICATE_APPLICATION", "이미 신청한 프로그램 회차입니다.");
            }
            const selectedCount = store.programApplications.filter((row) =>
              row.sessionId === body.sessionId && row.status === "SELECTED",
            ).length;
            if (selectedCount >= Number(session.capacity)) {
              return sendError(res, store.dataSetId, 409, "PROGRAM_CAPACITY_FULL", "프로그램 정원이 마감되었습니다.");
            }
            const created = {
              ...body, id: randomUUID(), status: "SUBMITTED",
              programName: program.name, sessionName: session.name,
              submittedAt: new Date().toISOString(),
            };
            store.programApplications.push(created as typeof store.programApplications[number]);
            recordAudit(activeIdentity, "CREATE", "PROGRAM_APPLICATION", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/program-applications/decision" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF","REVIEWER","SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "프로그램 선발 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const application = store.programApplications.find((row) => row.id === body.applicationId);
            if (!application) {
              return sendError(res, store.dataSetId, 404, "PROGRAM_APPLICATION_NOT_FOUND", "프로그램 신청을 찾을 수 없습니다.");
            }
            const before = { ...application };
            application.status = body.status;
            application.reviewNote = body.reviewNote;
            application.reviewedAt = new Date().toISOString();
            recordAudit(activeIdentity, "DECIDE", "PROGRAM_APPLICATION", String(application.id), before, application);
            return sendJson(res, store.dataSetId, application);
          }
          if (url.pathname === "/api/v1/completion-assessments" && req.method === "GET") {
            const identity = activeIdentity;
            if (!identity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            const requestedStudentId = url.searchParams.get("studentId");
            if (identity.roles.includes("STUDENT") && requestedStudentId !== identity.studentId) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "본인의 이수정보만 조회할 수 있습니다.");
            }
            if (
              !identity.roles.includes("STUDENT") &&
              !identity.roles.some((role) => ["EDUCATION_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role))
            ) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "이수정보 조회 권한이 없습니다.");
            }
            const data = requestedStudentId
              ? store.completionAssessments.filter((item) => item.studentId === requestedStudentId)
              : store.completionAssessments;
            return sendJson(res, store.dataSetId, { data });
          }
          if (url.pathname === "/api/v1/experiential-records" && req.method === "GET") {
            if (!activeIdentity) {
              return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            }
            const canReadAll = activeIdentity.roles.some((role) =>
              ["EDUCATION_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role),
            );
            if (!activeIdentity.studentId && !canReadAll) {
              return sendError(res, store.dataSetId, 403, "FORBIDDEN", "경험기록 조회 권한이 없습니다.");
            }
            const requestedType = url.searchParams.get("type");
            const requestedBusinessYearId = url.searchParams.get("businessYearId");
            const data = fakeExperientialRecords.filter((row) =>
              (canReadAll || row.studentId === activeIdentity.studentId) &&
              (!requestedType || row.type === requestedType) &&
              (!requestedBusinessYearId || row.businessYearId === requestedBusinessYearId),
            );
            return sendJson(res, store.dataSetId, { data });
          }
          if (url.pathname === "/api/v1/experiential-records" && req.method === "POST") {
            if (!activeIdentity?.roles.includes("STUDENT") || !activeIdentity.studentId) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학생 경험기록 등록 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const created = {
              ...body,
              id: randomUUID(),
              studentId: activeIdentity.studentId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            fakeExperientialRecords.push(created);
            recordAudit(activeIdentity, "CREATE", "EXPERIENTIAL_RECORD", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/budget/summary" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["BUDGET_STAFF","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "예산 조회 권한이 없습니다.");
            const allocationIds = new Set(fakeBudgetAllocations.map((row) => row.id));
            const allocated = fakeBudgetAllocations.reduce((sum, row) => sum + Number(row.allocatedAmount), 0);
            const planned = fakeBudgetAllocations.reduce((sum, row) => sum + Number(row.plannedAmount), 0);
            const executed = fakeBudgetExecutions.filter((row) => allocationIds.has(row.allocationId)).reduce((sum, row) => sum + Number(row.amount), 0);
            return sendJson(res, store.dataSetId, { allocated, planned, executed, balance: allocated - executed, executionRate: allocated ? Math.round(executed / allocated * 10000) / 100 : 0 });
          }
          if (url.pathname === "/api/v1/budget/change-history" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["BUDGET_STAFF","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "예산 조회 권한이 없습니다.");
            return sendJson(res, store.dataSetId, { data: fakeBudgetHistory });
          }
          if (url.pathname === "/api/v1/budget/operations" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["BUDGET_STAFF","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "예산 조회 권한이 없습니다.");
            const businessYearId = url.searchParams.get("businessYearId");
            const allocations = fakeBudgetAllocations.filter((row) => !businessYearId || row.businessYearId === businessYearId);
            const allocationIds = new Set(allocations.map((row) => row.id));
            return sendJson(res, store.dataSetId, { allocations, executions: fakeBudgetExecutions.filter((row) => allocationIds.has(row.allocationId)) });
          }
          if (url.pathname === "/api/v1/budget/allocations" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["BUDGET_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "예산 입력 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            if (Number(body.plannedAmount) > Number(body.allocatedAmount)) return sendError(res, store.dataSetId, 422, "VALIDATION_ERROR", "편성액은 배정액을 초과할 수 없습니다.");
            const allocation = { id: randomUUID(), ...body };
            fakeBudgetAllocations.push(allocation);
            recordAudit(activeIdentity, "CREATE", "BUDGET_ALLOCATION", String(allocation.id), undefined, allocation);
            return sendJson(res, store.dataSetId, allocation, 201);
          }
          if (url.pathname === "/api/v1/budget/executions" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["BUDGET_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "예산 입력 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const allocation = fakeBudgetAllocations.find((row) => row.id === body.allocationId);
            if (!allocation) return sendError(res, store.dataSetId, 404, "BUDGET_ALLOCATION_NOT_FOUND", "예산 배정을 찾을 수 없습니다.");
            if (body.evidenceFileId && !store.storedFiles.some((file) => (file as { id: string }).id === body.evidenceFileId)) {
              return sendError(res, store.dataSetId, 422, "BUDGET_EVIDENCE_FILE_NOT_AVAILABLE", "사용 가능한 예산 증빙파일을 찾을 수 없습니다.");
            }
            const executed = fakeBudgetExecutions.filter((row) => row.allocationId === body.allocationId).reduce((sum, row) => sum + Number(row.amount), 0);
            if (executed + Number(body.amount) > Number(allocation.allocatedAmount)) return sendError(res, store.dataSetId, 409, "BUDGET_BALANCE_EXCEEDED", "예산 잔액을 초과할 수 없습니다.");
            const execution = { id: randomUUID(), ...body, createdBy: activeIdentity.userId, createdAt: new Date().toISOString() };
            fakeBudgetExecutions.push(execution);
            recordAudit(activeIdentity, "CREATE", "BUDGET_EXECUTION", String(execution.id), undefined, execution);
            return sendJson(res, store.dataSetId, execution, 201);
          }
          if (url.pathname === "/api/v1/budget/amount-changes" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["BUDGET_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "예산 변경 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const allocation = fakeBudgetAllocations.find((row) => row.id === body.allocationId);
            if (!allocation) return sendError(res, store.dataSetId, 404, "BUDGET_ALLOCATION_NOT_FOUND", "예산 배정을 찾을 수 없습니다.");
            const field = String(body.field);
            const previousAmount = Number(allocation[field]);
            const executed = fakeBudgetExecutions.filter((row) => row.allocationId === body.allocationId).reduce((sum, row) => sum + Number(row.amount), 0);
            if (field === "allocatedAmount" && Number(body.newAmount) < Math.max(executed, Number(allocation.plannedAmount))) return sendError(res, store.dataSetId, 409, "AMOUNT_BELOW_COMMITTED", "배정액은 편성액 또는 집행액보다 작을 수 없습니다.");
            if (field === "plannedAmount" && Number(body.newAmount) > Number(allocation.allocatedAmount)) return sendError(res, store.dataSetId, 409, "PLAN_EXCEEDS_ALLOCATION", "편성액은 배정액을 초과할 수 없습니다.");
            allocation[field] = body.newAmount;
            const history = {
              id: randomUUID(), allocationId: allocation.id,
              budgetCode: allocation.budgetCode, category: allocation.category,
              fieldName: field, previousAmount: String(previousAmount), newAmount: String(body.newAmount),
              reason: body.reason, changedBy: activeIdentity.userId,
              changedByName: activeIdentity.displayName, changedAt: new Date().toISOString(),
            };
            fakeBudgetHistory.unshift(history);
            recordAudit(activeIdentity, "CHANGE_AMOUNT", "BUDGET_ALLOCATION", String(allocation.id), { [field]: previousAmount }, { [field]: body.newAmount });
            return sendJson(res, store.dataSetId, { allocationId: allocation.id, field, previousAmount, newAmount: body.newAmount });
          }
          if (url.pathname === "/api/v1/performance/overview" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 조회 권한이 없습니다.");
            return sendJson(res, store.dataSetId, { ...fakePerformanceOverview, evidence: fakePerformanceEvidence });
          }
          if (url.pathname === "/api/v1/performance-reviews" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 자가평가 조회 권한이 없습니다.");
            }
            const businessYearId = url.searchParams.get("businessYearId");
            return sendJson(res, store.dataSetId, {
              data: fakePerformanceReviews.filter((row) => !businessYearId || row.businessYearId === businessYearId),
            });
          }
          if (url.pathname === "/api/v1/performance-reviews" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 자가평가 등록 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const created = {
              ...body, id: randomUUID(), status: "DRAFT",
              createdBy: activeIdentity.userId,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            fakePerformanceReviews.push(created);
            recordAudit(activeIdentity, "CREATE", "PERFORMANCE_REVIEW", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/performance/source-summary" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 원천데이터 조회 권한이 없습니다.");
            }
            return sendJson(res, store.dataSetId, { data: [
              { id: "students", domain: "STUDENT", table: "students", count: store.students.length, yearScoped: false },
              { id: "applications", domain: "PROGRAM", table: "program_applications", count: store.programApplications.length, yearScoped: true },
              { id: "companies", domain: "COMPANY", table: "company_participations", count: store.companyParticipations.length, yearScoped: true },
              { id: "completion", domain: "COMPLETION", table: "completion_assessments", count: store.completionAssessments.length, yearScoped: true },
            ] });
          }
          if (url.pathname === "/api/v1/performance-targets" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 목표 등록 권한이 없습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            if (!fakePerformanceOverview.indicators.some((row) => row.id === body.indicatorId)) {
              return sendError(res, store.dataSetId, 404, "PERFORMANCE_INDICATOR_NOT_FOUND", "성과지표를 찾을 수 없습니다.");
            }
            const created = {
              ...body, id: randomUUID(), targetValue: String(body.targetValue),
              approvedBy: activeIdentity.userId, approvedAt: new Date().toISOString(),
            };
            fakePerformanceOverview.targets.push(created);
            recordAudit(activeIdentity, "CREATE", "PERFORMANCE_TARGET", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/performance-indicators" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과지표 등록 권한이 없습니다.");
            const created = { ...(await readBody(req) as object), id: randomUUID(), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            fakePerformanceOverview.indicators.push(created);
            recordAudit(activeIdentity, "CREATE", "PERFORMANCE_INDICATOR", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/performance-results/calculate" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과실적 산정 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const indicator = fakePerformanceOverview.indicators.find((row) => row.id === body.indicatorId);
            if (!indicator) return sendError(res, store.dataSetId, 404, "PERFORMANCE_INDICATOR_NOT_FOUND", "성과지표를 찾을 수 없습니다.");
            const sources: Record<string, number> = {
              STUDENTS: store.students.length,
              COMPANIES: store.companies.length,
              PROGRAMS: store.programs.length,
              COMPANY_PARTICIPATIONS: store.companyParticipations.length,
              EXPERIENTIAL_RECORDS: fakeExperientialRecords.length,
              COURSE_COMPLETIONS: 0,
              PROGRAM_APPLICATIONS: store.programApplications.length,
            };
            const formula = indicator.calculationFormula as { type: string; source?: string; numerator?: string; denominator?: string; multiplier?: number; precision?: number };
            const actualValue = formula.type === "COUNT"
              ? sources[formula.source ?? ""] ?? 0
              : Number((((sources[formula.numerator ?? ""] ?? 0) / (sources[formula.denominator ?? ""] || 1)) * (formula.multiplier ?? 100)).toFixed(formula.precision ?? 2));
            const dryRun = body.dryRun ?? true;
            const calculatedAt = new Date().toISOString();
            let resultId: string | null = null;
            if (!dryRun) {
              const existing = fakePerformanceOverview.results.find((row) => row.indicatorId === body.indicatorId);
              if (existing && existing.status !== "DRAFT") return sendError(res, store.dataSetId, 409, "PERFORMANCE_RESULT_LOCKED", "검토 중이거나 공개된 성과실적은 재산정할 수 없습니다.");
              const result = {
                ...existing, id: existing?.id ?? randomUUID(), indicatorId: body.indicatorId,
                businessYearId: body.businessYearId, actualValue: String(actualValue), status: "DRAFT",
                calculationSnapshot: { formula, sources, calculationVersion: "performance-formula-v1", calculatedAt },
                updatedAt: calculatedAt, createdAt: existing?.createdAt ?? calculatedAt,
              };
              fakePerformanceOverview.results = fakePerformanceOverview.results.filter((row) => row.id !== result.id);
              fakePerformanceOverview.results.push(result);
              resultId = String(result.id);
              recordAudit(activeIdentity, "CALCULATE", "PERFORMANCE_RESULT", resultId, existing, result);
            }
            return sendJson(res, store.dataSetId, {
              indicatorId: body.indicatorId, businessYearId: body.businessYearId, dryRun,
              actualValue, formula, sources, calculationVersion: "performance-formula-v1",
              calculatedAt, resultId,
            });
          }
          if (url.pathname === "/api/v1/content" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["CONTENT_EDITOR","REVIEWER","AUDITOR","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "콘텐츠 조회 권한이 없습니다.");
            const contentType = url.searchParams.get("contentType");
            const status = url.searchParams.get("status");
            return sendJson(res, store.dataSetId, {
              data: fakeContentItems.filter((row) => (!contentType || row.contentType === contentType) && (!status || row.status === status)),
              attachments: fakeContentAttachments,
            });
          }
          if (url.pathname === "/api/v1/content" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["CONTENT_EDITOR","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "콘텐츠 작성 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            if (fakeContentItems.some((row) => row.contentType === body.contentType && row.slug === body.slug)) return sendError(res, store.dataSetId, 409, "CONTENT_SLUG_CONFLICT", "같은 유형의 slug가 이미 존재합니다.");
            const attachmentFileIds = (body.attachmentFileIds ?? []) as string[];
            const item = {
              ...body, id: randomUUID(), status: "DRAFT",
              authorId: activeIdentity.userId, publishedAt: null,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            delete item.attachmentFileIds;
            fakeContentItems.push(item);
            for (const fileId of attachmentFileIds) fakeContentAttachments.push({ id: randomUUID(), contentId: item.id, fileId, createdAt: new Date().toISOString() });
            fakeContentVersions.push({
              id: randomUUID(), contentId: item.id, version: 1,
              snapshot: { ...item, attachmentFileIds },
              changeSummary: "초안 생성", createdBy: activeIdentity.userId,
              createdAt: new Date().toISOString(),
            });
            recordAudit(activeIdentity, "CREATE", "CONTENT_ITEM", String(item.id), undefined, item);
            return sendJson(res, store.dataSetId, item, 201);
          }
          const contentVersionsMatch = url.pathname.match(/^\/api\/v1\/content\/([^/]+)\/versions$/);
          if (contentVersionsMatch && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["CONTENT_EDITOR","REVIEWER","AUDITOR","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "콘텐츠 버전 조회 권한이 없습니다.");
            return sendJson(res, store.dataSetId, {
              data: fakeContentVersions
                .filter((row) => row.contentId === contentVersionsMatch[1])
                .sort((a, b) => Number(b.version) - Number(a.version)),
            });
          }
          const contentUpdateMatch = url.pathname.match(/^\/api\/v1\/content\/([^/]+)$/);
          if (contentUpdateMatch && req.method === "PATCH") {
            if (!activeIdentity?.roles.some((role) => ["CONTENT_EDITOR","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "콘텐츠 수정 권한이 없습니다.");
            const index = fakeContentItems.findIndex((row) => row.id === contentUpdateMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "CONTENT_NOT_FOUND", "콘텐츠를 찾을 수 없습니다.");
            const before = fakeContentItems[index]!;
            if (before.status !== "DRAFT") return sendError(res, store.dataSetId, 409, "CONTENT_NOT_EDITABLE", "초안 상태의 콘텐츠만 수정할 수 있습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const attachmentFileIds = body.attachmentFileIds as string[] | undefined;
            const { changeSummary, ...changes } = body;
            delete changes.attachmentFileIds;
            const updated = { ...before, ...changes, updatedAt: new Date().toISOString() };
            fakeContentItems[index] = updated;
            if (attachmentFileIds) {
              fakeContentAttachments = fakeContentAttachments.filter((row) => row.contentId !== updated.id);
              for (const fileId of attachmentFileIds) fakeContentAttachments.push({ id: randomUUID(), contentId: updated.id, fileId, createdAt: new Date().toISOString() });
            }
            const existingVersions = fakeContentVersions.filter((row) => row.contentId === updated.id);
            const effectiveFiles = fakeContentAttachments.filter((row) => row.contentId === updated.id).map((row) => row.fileId);
            const version = Math.max(0, ...existingVersions.map((row) => Number(row.version))) + 1;
            fakeContentVersions.push({
              id: randomUUID(), contentId: updated.id, version,
              snapshot: { ...updated, attachmentFileIds: effectiveFiles },
              changeSummary, createdBy: activeIdentity.userId,
              createdAt: new Date().toISOString(),
            });
            recordAudit(activeIdentity, "UPDATE", "CONTENT_ITEM", String(updated.id), before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          const contentTransitionMatch = url.pathname.match(/^\/api\/v1\/content\/([^/]+)\/transition$/);
          if (contentTransitionMatch && req.method === "POST") {
            if (!activeIdentity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const action = String(body.action);
            const allowed = activeIdentity.roles.includes("SYSTEM_ADMIN") ||
              (action === "SUBMIT_REVIEW" && activeIdentity.roles.includes("CONTENT_EDITOR")) ||
              (action === "APPROVE" && activeIdentity.roles.includes("REVIEWER")) ||
              (action === "PUBLISH" && activeIdentity.roles.includes("CONTENT_EDITOR")) ||
              (action === "ARCHIVE" && activeIdentity.roles.some((role) => ["CONTENT_EDITOR","REVIEWER"].includes(role)));
            if (!allowed) return sendError(res, store.dataSetId, 403, "FORBIDDEN", "해당 콘텐츠 상태변경 권한이 없습니다.");
            const item = fakeContentItems.find((row) => row.id === contentTransitionMatch[1]);
            if (!item) return sendError(res, store.dataSetId, 404, "CONTENT_NOT_FOUND", "콘텐츠를 찾을 수 없습니다.");
            const transitions: Record<string, { from: string[]; to: string }> = {
              SUBMIT_REVIEW: { from: ["DRAFT"], to: "IN_REVIEW" },
              APPROVE: { from: ["IN_REVIEW"], to: "APPROVED" },
              PUBLISH: { from: ["APPROVED"], to: "PUBLISHED" },
              ARCHIVE: { from: ["DRAFT","IN_REVIEW","APPROVED","PUBLISHED"], to: "ARCHIVED" },
            };
            const transition = transitions[action];
            if (!transition?.from.includes(String(item.status))) return sendError(res, store.dataSetId, 409, "INVALID_CONTENT_TRANSITION", "현재 상태에서 수행할 수 없는 작업입니다.");
            const before = { ...item };
            item.status = transition.to;
            item.reviewedBy = action === "APPROVE" ? activeIdentity.userId : item.reviewedBy;
            item.publishedAt = action === "PUBLISH" ? (body.publishAt ?? new Date().toISOString()) : item.publishedAt;
            item.updatedAt = new Date().toISOString();
            recordAudit(activeIdentity, action, "CONTENT_ITEM", String(item.id), before, item);
            return sendJson(res, store.dataSetId, item);
          }
          if (url.pathname === "/api/v1/performance-results" && req.method === "PUT") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과실적 입력 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const previous = fakePerformanceOverview.results.find((row) => row.indicatorId === body.indicatorId);
            const result = {
              ...previous, ...body, id: previous?.id ?? randomUUID(),
              actualValue: String(body.actualValue), status: "DRAFT",
              publicApprovedBy: null, publicApprovedAt: null, updatedAt: new Date().toISOString(),
            };
            fakePerformanceOverview.results = fakePerformanceOverview.results.filter((row) => row.id !== result.id);
            fakePerformanceOverview.results.push(result);
            recordAudit(activeIdentity, "UPSERT", "PERFORMANCE_RESULT", String(result.id), previous, result);
            return sendJson(res, store.dataSetId, result);
          }
          if (url.pathname === "/api/v1/performance-evidence" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과증빙 연결 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            if (!fakePerformanceOverview.results.some((row) => row.id === body.resultId)) return sendError(res, store.dataSetId, 404, "PERFORMANCE_RESULT_NOT_FOUND", "성과 실적을 찾을 수 없습니다.");
            const evidence = { id: randomUUID(), ...body, createdAt: new Date().toISOString() };
            fakePerformanceEvidence.push(evidence);
            recordAudit(activeIdentity, "LINK", "PERFORMANCE_EVIDENCE", String(evidence.id), undefined, evidence);
            return sendJson(res, store.dataSetId, evidence, 201);
          }
          const performanceSubmitMatch = url.pathname.match(/^\/api\/v1\/performance-results\/([^/]+)\/submit-review$/);
          if (performanceSubmitMatch && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["PERFORMANCE_STAFF","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 검토요청 권한이 없습니다.");
            const result = fakePerformanceOverview.results.find((row) => row.id === performanceSubmitMatch[1]);
            if (!result) return sendError(res, store.dataSetId, 404, "PERFORMANCE_RESULT_NOT_FOUND", "성과 실적을 찾을 수 없습니다.");
            if (result.status !== "DRAFT") return sendError(res, store.dataSetId, 409, "PERFORMANCE_RESULT_NOT_DRAFT", "초안 상태의 실적만 검토 요청할 수 있습니다.");
            result.status = "IN_REVIEW"; result.updatedAt = new Date().toISOString();
            recordAudit(activeIdentity, "SUBMIT_REVIEW", "PERFORMANCE_RESULT", String(result.id), { status: "DRAFT" }, { status: "IN_REVIEW" });
            return sendJson(res, store.dataSetId, result);
          }
          const performanceApprovalMatch = url.pathname.match(/^\/api\/v1\/performance-results\/([^/]+)\/approve-public$/);
          if (performanceApprovalMatch && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "성과 공개승인 권한이 없습니다.");
            const result = fakePerformanceOverview.results.find((row) => row.id === performanceApprovalMatch[1]);
            if (!result) return sendError(res, store.dataSetId, 404, "PERFORMANCE_RESULT_NOT_FOUND", "성과 실적을 찾을 수 없습니다.");
            if (result.status !== "IN_REVIEW") return sendError(res, store.dataSetId, 409, "PERFORMANCE_RESULT_NOT_REVIEWABLE", "검토요청 상태의 실적만 공개 승인할 수 있습니다.");
            if (!fakePerformanceEvidence.some((row) => row.resultId === result.id)) return sendError(res, store.dataSetId, 409, "PERFORMANCE_EVIDENCE_REQUIRED", "공개 승인 전에 성과 증빙자료를 연결해야 합니다.");
            result.status = "PUBLISHED"; result.publicApprovedBy = activeIdentity.userId; result.publicApprovedAt = new Date().toISOString(); result.updatedAt = new Date().toISOString();
            recordAudit(activeIdentity, "APPROVE_PUBLICATION", "PERFORMANCE_RESULT", String(result.id), { status: "IN_REVIEW" }, { status: "PUBLISHED" });
            return sendJson(res, store.dataSetId, result);
          }
          if (url.pathname === "/api/v1/files" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF","BENEFIT_STAFF","COMPANY_STAFF","BUDGET_STAFF","PERFORMANCE_STAFF","CONTENT_EDITOR","AUDITOR","REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "증빙 조회 권한이 없습니다.");
            recordAudit(activeIdentity, "LIST", "STORED_FILE", undefined, undefined, { resultCount: store.storedFiles.length, personalInformationCount: store.storedFiles.filter((item) => Boolean((item as Record<string, unknown>).containsPersonalInfo)).length });
            return sendJson(res, store.dataSetId, { data: store.storedFiles });
          }
          const fileRelationshipMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)\/relationships$/);
          if (fileRelationshipMatch && req.method === "GET") {
            if (!activeIdentity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            const file = store.storedFiles.find((item) => (item as { id: string }).id === fileRelationshipMatch[1]) as Record<string, unknown> | undefined;
            if (!file) return sendError(res, store.dataSetId, 404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
            const relations = fakeFileRelations(String(file.id));
            if (!fakeCanReadFile(activeIdentity, relations)) return sendError(res, store.dataSetId, 403, "FILE_ACCESS_DENIED", "파일 관계정보를 조회할 권한이 없습니다.");
            recordAudit(activeIdentity, "VIEW_RELATIONSHIPS", "STORED_FILE", String(file.id), undefined, { containsPersonalInfo: file.containsPersonalInfo, relationCount: relations.length });
            return sendJson(res, store.dataSetId, { file, relations });
          }
          const fileDownloadMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)\/download$/);
          if (fileDownloadMatch && req.method === "GET") {
            if (!activeIdentity) return sendError(res, store.dataSetId, 401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
            const file = store.storedFiles.find((item) => (item as { id: string }).id === fileDownloadMatch[1]) as Record<string, unknown> | undefined;
            if (!file) return sendError(res, store.dataSetId, 404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
            const relations = fakeFileRelations(String(file.id));
            if (!fakeCanReadFile(activeIdentity, relations)) return sendError(res, store.dataSetId, 403, "FILE_ACCESS_DENIED", "파일을 다운로드할 권한이 없습니다.");
            recordAudit(activeIdentity, "DOWNLOAD", "STORED_FILE", String(file.id), undefined, { containsPersonalInfo: file.containsPersonalInfo, relationTypes: [...new Set(relations.map((row) => row.relationType))] });
            const binary = Buffer.from("%PDF-1.4\n% FD_Set_01 preview evidence\n");
            res.statusCode = 200;
            res.setHeader("Content-Type", String(file.mimeType ?? "application/octet-stream"));
            res.setHeader("Content-Length", String(binary.length));
            res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(String(file.originalName))}`);
            return res.end(binary);
          }
          const fileArchiveMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)$/);
          if (fileArchiveMatch && req.method === "DELETE") {
            if (!activeIdentity?.roles.includes("SYSTEM_ADMIN")) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FILE_ARCHIVE_DENIED", "시스템 관리자만 가상 파일을 보관할 수 있습니다.");
            const index = store.storedFiles.findIndex((item) => (item as { id: string }).id === fileArchiveMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
            if (fakeFileRelations(fileArchiveMatch[1]).length) return sendError(res, store.dataSetId, 409, "FILE_IN_USE", "업무 데이터에 연결된 파일은 보관할 수 없습니다.");
            const [file] = store.storedFiles.splice(index, 1);
            recordAudit(activeIdentity, "ARCHIVE", "STORED_FILE", fileArchiveMatch[1], file);
            res.statusCode = 204; return res.end();
          }
          if (url.pathname === "/api/v1/companies" && req.method === "GET") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF","REVIEWER","SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업 조회 권한이 없습니다.");
            return sendJson(res, store.dataSetId, { data: store.companies.map((company) => ({ ...(company as object), registrationNumber: (company as Record<string, unknown>).registrationNumber ?? "FAKE-BIZ-0001", isPublic: (company as Record<string, unknown>).isPublic ?? true, isActive: (company as Record<string, unknown>).isActive ?? true, companyContacts: fakeCompanyContacts.filter((item) => item.companyId === (company as {id:string}).id && !item.deletedAt), companyExperts: fakeCompanyExperts.filter((item) => item.companyId === (company as {id:string}).id), companyParticipations: store.companyParticipations.filter((item) => item.companyId === (company as {id:string}).id) })) });
          }
          const companyMasterMatch = url.pathname.match(/^\/api\/v1\/companies\/([0-9a-f-]+)$/);
          if (companyMasterMatch && req.method === "PATCH") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업정보 수정 권한이 없습니다.");
            const index = store.companies.findIndex((item) => (item as { id: string }).id === companyMasterMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COMPANY_NOT_FOUND", "기업정보를 찾을 수 없습니다.");
            const before = store.companies[index] as Record<string, unknown>;
            const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
            store.companies[index] = updated;
            recordAudit(activeIdentity, "UPDATE", "COMPANY", companyMasterMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          const companyContactCreateMatch = url.pathname.match(/^\/api\/v1\/companies\/([0-9a-f-]+)\/contacts$/);
          if (companyContactCreateMatch && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업 담당자 관리 권한이 없습니다.");
            if (!store.companies.some((item) => (item as { id: string }).id === companyContactCreateMatch[1])) return sendError(res, store.dataSetId, 404, "COMPANY_NOT_FOUND", "기업정보를 찾을 수 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            if (body.isPrimary) fakeCompanyContacts = fakeCompanyContacts.map((item) => item.companyId === companyContactCreateMatch[1] ? { ...item, isPrimary: false } : item);
            const contact = { ...body, id: randomUUID(), companyId: companyContactCreateMatch[1], isPrimary: body.isPrimary ?? false, createdAt: new Date().toISOString() };
            fakeCompanyContacts.push(contact);
            recordAudit(activeIdentity, "CREATE", "COMPANY_CONTACT", String(contact.id), undefined, contact);
            return sendJson(res, store.dataSetId, contact, 201);
          }
          const companyContactArchiveMatch = url.pathname.match(/^\/api\/v1\/company-contacts\/([0-9a-f-]+)$/);
          if (companyContactArchiveMatch && req.method === "DELETE") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업 담당자 관리 권한이 없습니다.");
            const index = fakeCompanyContacts.findIndex((item) => item.id === companyContactArchiveMatch[1] && !item.deletedAt);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COMPANY_CONTACT_NOT_FOUND", "기업 담당자를 찾을 수 없습니다.");
            const before = fakeCompanyContacts[index]!;
            const archived = { ...before, isPrimary: false, deletedAt: new Date().toISOString() };
            fakeCompanyContacts[index] = archived;
            recordAudit(activeIdentity, "ARCHIVE", "COMPANY_CONTACT", companyContactArchiveMatch[1], before, archived);
            return sendJson(res, store.dataSetId, archived);
          }
          const companyExpertCreateMatch = url.pathname.match(/^\/api\/v1\/companies\/([0-9a-f-]+)\/experts$/);
          if (companyExpertCreateMatch && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업 전문가 관리 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const expert = { ...body, id: randomUUID(), companyId: companyExpertCreateMatch[1], profile: body.profile ?? {}, isActive: true };
            fakeCompanyExperts.push(expert);
            recordAudit(activeIdentity, "CREATE", "COMPANY_EXPERT", String(expert.id), undefined, expert);
            return sendJson(res, store.dataSetId, expert, 201);
          }
          const companyExpertStatusMatch = url.pathname.match(/^\/api\/v1\/company-experts\/([0-9a-f-]+)\/status$/);
          if (companyExpertStatusMatch && req.method === "PATCH") {
            if (!activeIdentity?.roles.some((role) => ["COMPANY_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "기업 전문가 관리 권한이 없습니다.");
            const index = fakeCompanyExperts.findIndex((item) => item.id === companyExpertStatusMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COMPANY_EXPERT_NOT_FOUND", "기업 전문가를 찾을 수 없습니다.");
            const before = fakeCompanyExperts[index]!;
            const updated = { ...before, ...(await readBody(req) as object) };
            fakeCompanyExperts[index] = updated;
            recordAudit(activeIdentity, "STATUS_CHANGE", "COMPANY_EXPERT", companyExpertStatusMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          if (url.pathname === "/api/v1/company-participations" && req.method === "GET") {
            if (!activeIdentity?.roles.includes("COMPANY_MANAGER") || !activeIdentity.companyId) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "승인된 기업 담당자만 조회할 수 있습니다.");
            const company = store.companies.find((item) => (item as {id:string}).id === activeIdentity.companyId);
            const participationType = url.searchParams.get("participationType");
            const businessYearId = url.searchParams.get("businessYearId");
            const data = store.companyParticipations.filter((item) =>
              item.companyId === activeIdentity.companyId &&
              (!participationType || item.participationType === participationType) &&
              (!businessYearId || item.businessYearId === businessYearId),
            );
            return sendJson(res, store.dataSetId, { company, data });
          }
          if (url.pathname === "/api/v1/company-participations" && req.method === "POST") {
            if (!activeIdentity?.roles.includes("COMPANY_MANAGER") || !activeIdentity.companyId) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "승인된 참여기업 담당자만 활동을 등록할 수 있습니다.");
            }
            const body = await readBody(req) as Record<string, unknown>;
            const created = {
              ...body, id: randomUUID(), companyId: activeIdentity.companyId,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            store.companyParticipations.push(created as typeof store.companyParticipations[number]);
            recordAudit(activeIdentity, "CREATE", "COMPANY_PARTICIPATION", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/company-portfolio-candidates" && req.method === "GET") {
            if (!activeIdentity?.roles.includes("COMPANY_MANAGER") || !activeIdentity.companyId) {
              return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "참여기업 평가 권한이 없습니다.");
            }
            const data = fakeExperientialRecords.filter((row) =>
              row.type === "PROJECT" &&
              (row.evidence as Record<string, unknown> | undefined)?.publicConsent === true,
            );
            return sendJson(res, store.dataSetId, { data });
          }
          const canManageAcademics = activeIdentity?.roles.some((role) =>
            ["EDUCATION_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role),
          );
          const canManagePrograms = activeIdentity?.roles.some((role) =>
            ["EDUCATION_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role),
          );
          if (url.pathname === "/api/v1/program-operations" && req.method === "GET") {
            if (!canManagePrograms) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "프로그램 운영 권한이 없습니다.");
            const sessionId = url.searchParams.get("sessionId");
            const assignmentIds = new Set(fakeAssignments.filter((row) => row.sessionId === sessionId).map((row) => row.id));
            const surveyIds = new Set(fakeSurveys.filter((row) => row.sessionId === sessionId).map((row) => row.id));
            return sendJson(res, store.dataSetId, {
              attendanceEvents: fakeAttendanceEvents.filter((row) => row.sessionId === sessionId),
              assignments: fakeAssignments.filter((row) => row.sessionId === sessionId),
              submissions: fakeAssignmentSubmissions.filter((row) => assignmentIds.has(row.assignmentId)),
              surveys: fakeSurveys.filter((row) => row.sessionId === sessionId),
              surveyResponses: fakeSurveyResponses.filter((row) => surveyIds.has(row.surveyId)),
              completions: fakeProgramCompletions.filter((row) => row.sessionId === sessionId),
              participants: store.programApplications.filter((row) => row.sessionId === sessionId && ["SELECTED", "WAITLISTED"].includes(String(row.status))),
            });
          }
          if (url.pathname === "/api/v1/program-learning" && req.method === "GET") {
            const sessionId = url.searchParams.get("sessionId");
            const studentId = url.searchParams.get("studentId");
            const canRead = activeIdentity?.studentId === studentId ||
              activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role));
            if (!canRead) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "본인의 학습활동만 조회할 수 있습니다.");
            const assignmentRows = fakeAssignments.filter((row) => row.sessionId === sessionId);
            const surveyRows = fakeSurveys.filter((row) => row.sessionId === sessionId);
            const assignmentIds = new Set(assignmentRows.map((row) => row.id));
            const surveyIds = new Set(surveyRows.map((row) => row.id));
            return sendJson(res, store.dataSetId, {
              assignments: assignmentRows,
              submissions: fakeAssignmentSubmissions.filter((row) => assignmentIds.has(row.assignmentId) && row.studentId === studentId),
              surveys: surveyRows,
              surveyResponses: fakeSurveyResponses.filter((row) => surveyIds.has(row.surveyId) && row.studentId === studentId),
            });
          }
          if (url.pathname === "/api/v1/attendance-events" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "출석회차 생성 권한이 없습니다.");
            const created = { ...(await readBody(req) as object), id: randomUUID() };
            fakeAttendanceEvents.push(created);
            recordAudit(activeIdentity, "CREATE", "ATTENDANCE_EVENT", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/attendance-records/bulk" && req.method === "PUT") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "출석 처리 권한이 없습니다.");
            const body = await readBody(req) as { records?: unknown[] };
            recordAudit(activeIdentity, "BULK_UPSERT", "ATTENDANCE_EVENT", undefined, undefined, body);
            return sendJson(res, store.dataSetId, { affected: body.records?.length ?? 0 });
          }
          if (url.pathname === "/api/v1/assignments" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "과제 생성 권한이 없습니다.");
            const created = { ...(await readBody(req) as object), id: randomUUID() };
            fakeAssignments.push(created);
            recordAudit(activeIdentity, "CREATE", "ASSIGNMENT", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/assignment-submissions" && req.method === "PUT") {
            if (!activeIdentity?.roles.includes("STUDENT") || !activeIdentity.studentId) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학생 제출 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            if (body.studentId !== activeIdentity.studentId) return sendError(res, store.dataSetId, 403, "FORBIDDEN", "본인의 과제만 제출할 수 있습니다.");
            const assignment = fakeAssignments.find((row) => row.id === body.assignmentId);
            if (!assignment) return sendError(res, store.dataSetId, 404, "ASSIGNMENT_NOT_FOUND", "과제를 찾을 수 없습니다.");
            const selected = store.programApplications.some((row) => row.sessionId === assignment.sessionId && row.studentId === activeIdentity.studentId && row.status === "SELECTED");
            if (!selected) return sendError(res, store.dataSetId, 403, "PROGRAM_PARTICIPATION_REQUIRED", "선발된 프로그램 참여자만 제출할 수 있습니다.");
            const previous = fakeAssignmentSubmissions.find((row) => row.assignmentId === body.assignmentId && row.studentId === activeIdentity.studentId);
            const submission = {
              ...previous,
              ...body,
              id: previous?.id ?? randomUUID(),
              submittedAt: new Date().toISOString(),
              score: null,
              feedback: null,
              gradedAt: null,
              gradedBy: null,
            };
            fakeAssignmentSubmissions = fakeAssignmentSubmissions.filter((row) => row.id !== submission.id);
            fakeAssignmentSubmissions.push(submission);
            recordAudit(activeIdentity, "SUBMIT", "ASSIGNMENT_SUBMISSION", String(submission.id), previous, submission);
            return sendJson(res, store.dataSetId, submission);
          }
          if (url.pathname === "/api/v1/assignment-submissions/grade" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "과제 채점 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const index = fakeAssignmentSubmissions.findIndex((row) => row.id === body.submissionId);
            if (index < 0) return sendError(res, store.dataSetId, 404, "SUBMISSION_NOT_FOUND", "과제 제출물을 찾을 수 없습니다.");
            const before = fakeAssignmentSubmissions[index]!;
            const assignment = fakeAssignments.find((row) => row.id === before.assignmentId);
            if (assignment?.maxScore !== undefined && Number(body.score) > Number(assignment.maxScore)) {
              return sendError(res, store.dataSetId, 422, "SCORE_EXCEEDS_MAXIMUM", "점수가 과제 만점을 초과합니다.");
            }
            const updated = { ...before, score: body.score, feedback: body.feedback, gradedAt: new Date().toISOString(), gradedBy: activeIdentity.userId };
            fakeAssignmentSubmissions[index] = updated;
            recordAudit(activeIdentity, "GRADE", "ASSIGNMENT_SUBMISSION", String(updated.id), before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          if (url.pathname === "/api/v1/surveys" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "설문 생성 권한이 없습니다.");
            const created = { ...(await readBody(req) as object), id: randomUUID() };
            fakeSurveys.push(created);
            recordAudit(activeIdentity, "CREATE", "SURVEY", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          if (url.pathname === "/api/v1/survey-responses" && req.method === "POST") {
            if (!activeIdentity?.roles.includes("STUDENT") || !activeIdentity.studentId) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학생 응답 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            if (body.studentId && body.studentId !== activeIdentity.studentId) return sendError(res, store.dataSetId, 403, "FORBIDDEN", "본인의 설문만 응답할 수 있습니다.");
            const survey = fakeSurveys.find((row) => row.id === body.surveyId);
            if (!survey) return sendError(res, store.dataSetId, 404, "SURVEY_NOT_FOUND", "설문을 찾을 수 없습니다.");
            const selected = store.programApplications.some((row) => row.sessionId === survey.sessionId && row.studentId === activeIdentity.studentId && row.status === "SELECTED");
            if (!selected) return sendError(res, store.dataSetId, 403, "PROGRAM_PARTICIPATION_REQUIRED", "선발된 프로그램 참여자만 제출할 수 있습니다.");
            const response = {
              ...body,
              id: randomUUID(),
              studentId: survey.isAnonymous ? undefined : activeIdentity.studentId,
              submittedAt: new Date().toISOString(),
            };
            fakeSurveyResponses.push(response);
            recordAudit(activeIdentity, "SUBMIT", "SURVEY_RESPONSE", String(response.id), undefined, { surveyId: response.surveyId, anonymous: survey.isAnonymous });
            return sendJson(res, store.dataSetId, response, 201);
          }
          if (url.pathname === "/api/v1/program-completions/confirm" && req.method === "POST") {
            if (!canManagePrograms) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "이수확정 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const created = { ...body, id: randomUUID(), completed: fakeAttendanceEvents.some((row) => row.sessionId === body.sessionId), calculatedSnapshot: { fakeDataSetId: store.dataSetId }, confirmedAt: new Date().toISOString() };
            fakeProgramCompletions = fakeProgramCompletions.filter((row) => !(row.sessionId === body.sessionId && row.studentId === body.studentId));
            fakeProgramCompletions.push(created);
            recordAudit(activeIdentity, "CONFIRM_COMPLETION", "PROGRAM_COMPLETION", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created);
          }
          if (url.pathname === "/api/v1/reference/terms" && req.method === "GET") {
            return sendJson(res, store.dataSetId, { data: [fakeTerm] });
          }
          if (url.pathname === "/api/v1/courses" && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const created = { ...body, id: randomUUID(), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            store.courses.push(created);
            recordAudit(activeIdentity, "CREATE", "COURSE_MASTER", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          const courseMatch = url.pathname.match(/^\/api\/v1\/courses\/([^/]+)$/);
          if (courseMatch && ["PATCH", "DELETE"].includes(req.method ?? "")) {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const index = store.courses.findIndex((item) => (item as { id: string }).id === courseMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COURSE_NOT_FOUND", "교과목을 찾을 수 없습니다.");
            const before = store.courses[index] as Record<string, unknown>;
            if (req.method === "DELETE") {
              store.courses.splice(index, 1);
              recordAudit(activeIdentity, "ARCHIVE", "COURSE_MASTER", courseMatch[1], before);
              res.statusCode = 204; return res.end();
            }
            const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
            store.courses[index] = updated;
            recordAudit(activeIdentity, "UPDATE", "COURSE_MASTER", courseMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          if (url.pathname === "/api/v1/course-offerings" && req.method === "GET") {
            return sendJson(res, store.dataSetId, { data: fakeOfferings });
          }
          if (url.pathname === "/api/v1/course-offerings" && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const course = store.courses.find((item) => (item as { id: string }).id === body.courseMasterId) as { courseCode: string; name: string } | undefined;
            const created = {
              ...body, id: randomUUID(), sectionCode: body.sectionCode ?? "01",
              isActive: true, courseCode: course?.courseCode ?? "", courseName: course?.name ?? "",
              businessYearName: "2026학년도", termName: fakeTerm.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            fakeOfferings.push(created);
            recordAudit(activeIdentity, "CREATE", "COURSE_OFFERING", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          const offeringMatch = url.pathname.match(/^\/api\/v1\/course-offerings\/([^/]+)$/);
          if (offeringMatch && ["PATCH", "DELETE"].includes(req.method ?? "")) {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const index = fakeOfferings.findIndex((item) => item.id === offeringMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "COURSE_OFFERING_NOT_FOUND", "개설 교과목을 찾을 수 없습니다.");
            const before = fakeOfferings[index]!;
            if (req.method === "DELETE") {
              fakeOfferings.splice(index, 1);
              recordAudit(activeIdentity, "ARCHIVE", "COURSE_OFFERING", offeringMatch[1], before);
              res.statusCode = 204; return res.end();
            }
            const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
            fakeOfferings[index] = updated;
            recordAudit(activeIdentity, "UPDATE", "COURSE_OFFERING", offeringMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          if (url.pathname === "/api/v1/curricula" && req.method === "GET") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            return sendJson(res, store.dataSetId, { data: fakeCurricula });
          }
          if (url.pathname === "/api/v1/curricula" && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const created = { ...body, id: randomUUID(), version: body.version ?? 1, isPublished: body.isPublished ?? false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            fakeCurricula.push(created);
            recordAudit(activeIdentity, "CREATE", "CURRICULUM", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          const curriculumMatch = url.pathname.match(/^\/api\/v1\/curricula\/([^/]+)$/);
          if (curriculumMatch && ["PATCH", "DELETE"].includes(req.method ?? "")) {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const index = fakeCurricula.findIndex((item) => item.id === curriculumMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "CURRICULUM_NOT_FOUND", "교육과정을 찾을 수 없습니다.");
            const before = fakeCurricula[index]!;
            if (req.method === "DELETE") {
              fakeCurricula.splice(index, 1);
              recordAudit(activeIdentity, "ARCHIVE", "CURRICULUM", curriculumMatch[1], before);
              res.statusCode = 204; return res.end();
            }
            const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
            fakeCurricula[index] = updated;
            recordAudit(activeIdentity, "UPDATE", "CURRICULUM", curriculumMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          const curriculumRequirementsMatch = url.pathname.match(/^\/api\/v1\/curricula\/([^/]+)\/requirements$/);
          if (curriculumRequirementsMatch && req.method === "GET") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            return sendJson(res, store.dataSetId, { data: fakeRequirements.filter((item) => item.curriculumId === curriculumRequirementsMatch[1]) });
          }
          if (curriculumRequirementsMatch && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const created = { ...body, id: randomUUID(), curriculumId: curriculumRequirementsMatch[1], conditions: body.conditions ?? {}, sortOrder: body.sortOrder ?? 0, isRequired: body.isRequired ?? true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            fakeRequirements.push(created);
            recordAudit(activeIdentity, "CREATE", "CURRICULUM_REQUIREMENT", String(created.id), undefined, created);
            return sendJson(res, store.dataSetId, created, 201);
          }
          const requirementMatch = url.pathname.match(/^\/api\/v1\/curriculum-requirements\/([^/]+)$/);
          if (requirementMatch && ["PATCH", "DELETE"].includes(req.method ?? "")) {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "학사관리 권한이 없습니다.");
            const index = fakeRequirements.findIndex((item) => item.id === requirementMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "REQUIREMENT_NOT_FOUND", "이수요건을 찾을 수 없습니다.");
            const before = fakeRequirements[index]!;
            if (req.method === "DELETE") {
              fakeRequirements.splice(index, 1);
              recordAudit(activeIdentity, "ARCHIVE", "CURRICULUM_REQUIREMENT", requirementMatch[1], before);
              res.statusCode = 204; return res.end();
            }
            const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
            fakeRequirements[index] = updated;
            recordAudit(activeIdentity, "UPDATE", "CURRICULUM_REQUIREMENT", requirementMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          if (url.pathname === "/api/v1/course-imports/upload" && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "교과목 가져오기 권한이 없습니다.");
            const job = { id: randomUUID(), status: "VALIDATED", totalRows: 1, validRows: 1, invalidRows: 0, insertRows: 0, updateRows: 0, unchangedRows: 0, rows: [], sourceSystem: "FD_SET_01_FILE" };
            fakeImportJobs.set(String(job.id), job);
            return sendJson(res, store.dataSetId, job, 201);
          }
          if (url.pathname === "/api/v1/course-imports" && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "교과목 가져오기 권한이 없습니다.");
            const body = await readBody(req) as { rows?: Array<Record<string, unknown>>; sourceSystem?: string };
            const rows = body.rows ?? [];
            const validRows = rows.filter((row) => row.courseCode && row.name && row.defaultCredits !== undefined && row.externalId);
            const job = { id: randomUUID(), status: "VALIDATED", totalRows: rows.length, validRows: validRows.length, invalidRows: rows.length - validRows.length, insertRows: 0, updateRows: 0, unchangedRows: 0, rows, sourceSystem: body.sourceSystem };
            fakeImportJobs.set(String(job.id), job);
            return sendJson(res, store.dataSetId, job, 201);
          }
          const importActionMatch = url.pathname.match(/^\/api\/v1\/course-imports\/([^/]+)\/(preview|commit)$/);
          if (importActionMatch && req.method === "POST") {
            if (!canManageAcademics) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "교과목 가져오기 권한이 없습니다.");
            const job = fakeImportJobs.get(importActionMatch[1]!);
            if (!job) return sendError(res, store.dataSetId, 404, "IMPORT_NOT_FOUND", "가져오기 작업을 찾을 수 없습니다.");
            if (importActionMatch[2] === "preview") {
              job.status = "PREVIEWED";
              job.insertRows = job.validRows;
            } else {
              if (job.status !== "PREVIEWED" || Number(job.invalidRows) > 0) return sendError(res, store.dataSetId, 409, "IMPORT_NOT_READY", "오류 없이 preview를 완료해야 합니다.");
              job.status = "COMMITTED";
              for (const row of job.rows as Array<Record<string, unknown>>) {
                store.courses.push({ ...row, id: randomUUID(), isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              }
              recordAudit(activeIdentity, "IMPORT_COMMIT", "IMPORT_JOB", String(job.id), undefined, { totalRows: job.totalRows });
            }
            return sendJson(res, store.dataSetId, job);
          }
          if (url.pathname === "/api/v1/reference/business-years") return sendJson(res, store.dataSetId, { data: store.businessYears });
          if (url.pathname === "/api/v1/courses") {
            const data = store.courses.map((course) => ({
              isActive: true,
              createdAt: "2026-07-24T00:00:00.000Z",
              updatedAt: "2026-07-24T00:00:00.000Z",
              ...(course as Record<string, unknown>),
            }));
            return sendJson(res, store.dataSetId, {
              data,
              meta: { page: 1, pageSize: 100, total: data.length },
            });
          }
          if (url.pathname === "/api/v1/programs" && req.method === "GET") {
            return sendJson(res, store.dataSetId, {
              data: store.programs.map((program) => ({
                eligibilityRules: {}, completionRules: {}, termId: null,
                ...program,
                programSessions: program.programSessions.map((session, index) => ({
                  sequence: index + 1, venue: null, ...session,
                })),
              })),
            });
          }
          if (url.pathname === "/api/v1/programs" && req.method === "POST") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "프로그램 생성 권한이 없습니다.");
            const body = await readBody(req) as Record<string, unknown>;
            const sessions = (body.sessions ?? []) as Array<Record<string, unknown>>;
            const program = {
              ...body, id: randomUUID(), status: "DRAFT",
              programSessions: sessions.map((session) => ({ ...session, id: randomUUID(), status: "DRAFT" })),
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
            delete (program as Record<string, unknown>).sessions;
            store.programs.push(program as typeof store.programs[number]);
            recordAudit(activeIdentity, "CREATE", "PROGRAM", String(program.id), undefined, program);
            return sendJson(res, store.dataSetId, program, 201);
          }
          const programUpdateMatch = url.pathname.match(/^\/api\/v1\/programs\/([0-9a-f-]+)$/);
          if (programUpdateMatch && req.method === "PATCH") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "프로그램 수정 권한이 없습니다.");
            const index = store.programs.findIndex((program) => program.id === programUpdateMatch[1]);
            if (index < 0) return sendError(res, store.dataSetId, 404, "PROGRAM_NOT_FOUND", "프로그램을 찾을 수 없습니다.");
            const before = store.programs[index]!;
            if (before.status !== "DRAFT") return sendError(res, store.dataSetId, 409, "PROGRAM_NOT_EDITABLE", "초안 상태의 프로그램만 수정할 수 있습니다.");
            const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
            store.programs[index] = updated;
            recordAudit(activeIdentity, "UPDATE", "PROGRAM", programUpdateMatch[1], before, updated);
            return sendJson(res, store.dataSetId, updated);
          }
          const programSessionUpdateMatch = url.pathname.match(/^\/api\/v1\/program-sessions\/([0-9a-f-]+)$/);
          if (programSessionUpdateMatch && req.method === "PATCH") {
            if (!activeIdentity?.roles.some((role) => ["EDUCATION_STAFF", "SYSTEM_ADMIN"].includes(role))) return sendError(res, store.dataSetId, activeIdentity ? 403 : 401, "FORBIDDEN", "프로그램 회차 수정 권한이 없습니다.");
            for (const program of store.programs) {
              const index = program.programSessions.findIndex((session) => session.id === programSessionUpdateMatch[1]);
              if (index < 0) continue;
              const before = program.programSessions[index]!;
              if (before.status !== "DRAFT") return sendError(res, store.dataSetId, 409, "PROGRAM_SESSION_NOT_EDITABLE", "초안 상태의 회차만 수정할 수 있습니다.");
              const updated = { ...before, ...(await readBody(req) as object), updatedAt: new Date().toISOString() };
              program.programSessions[index] = updated;
              recordAudit(activeIdentity, "UPDATE", "PROGRAM_SESSION", programSessionUpdateMatch[1], before, updated);
              return sendJson(res, store.dataSetId, updated);
            }
            return sendError(res, store.dataSetId, 404, "PROGRAM_SESSION_NOT_FOUND", "프로그램 회차를 찾을 수 없습니다.");
          }
          if (url.pathname === "/api/v1/public/companies") return sendJson(res, store.dataSetId, { data: store.companies });
          if (url.pathname === "/api/v1/public/performance-results") {
            const data = fakePerformanceOverview.results
              .filter((row) => row.status === "PUBLISHED")
              .map((row) => {
                const indicator = fakePerformanceOverview.indicators.find((item) => item.id === row.indicatorId);
                return {
                  id: row.id, actualValue: row.actualValue,
                  calculationSnapshot: row.calculationSnapshot,
                  publishedAt: row.publicApprovedAt ?? now,
                  indicatorCode: indicator?.code,
                  indicatorName: indicator?.name,
                  unit: indicator?.unit,
                };
              });
            return sendJson(res, store.dataSetId, { data });
          }
          if (url.pathname === "/api/v1/public/content") {
            const contentType = url.searchParams.get("contentType");
            const currentTime = Date.now();
            const data = fakeContentItems.filter((item) =>
              item.status === "PUBLISHED" &&
              (!contentType || item.contentType === contentType) &&
              Boolean(item.publishedAt) &&
              new Date(String(item.publishedAt)).getTime() <= currentTime
            );
            return sendJson(res, store.dataSetId, { data, meta: { page: 1, pageSize: 100, total: data.length } });
          }
          return next();
        } catch (error) {
          server.config.logger.error(`Fake data request failed: ${String(error)}`);
          return sendError(res, store.dataSetId, 503, "FAKE_DATA_SET_UNAVAILABLE", `Fake data set ${dataSetId} is unavailable.`);
        }
      });
    },
  };
}
