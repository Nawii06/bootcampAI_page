import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import {
  BenefitBulkCalculationResponseSchema,
  BenefitOperationsResponseSchema,
  AuditLogListResponseSchema,
  BudgetChangeHistoryResponseSchema,
  BusinessYearListResponseSchema,
  CompanyApplicationsResponseSchema,
  CompanyListResponseSchema,
  CompanyParticipationListResponseSchema,
  CompanyPortfolioCandidateListResponseSchema,
  CompletionAssessmentListResponseSchema,
  ContentVersionListResponseSchema,
  CourseListResponseSchema,
  CourseOfferingListResponseSchema,
  CurriculumListResponseSchema,
  CurriculumRequirementListResponseSchema,
  ExperientialRecordListResponseSchema,
  FakeIdentityListResponseSchema,
  FakeOperationsResponseSchema,
  ImportJobSummarySchema,
  PerformanceOverviewResponseSchema,
  PerformanceCalculationResponseSchema,
  PerformanceReviewListResponseSchema,
  PerformanceSourceSummaryResponseSchema,
  ProgramApplicationsResponseSchema,
  ProgramLearningResponseSchema,
  ProgramListResponseSchema,
  ProgramOperationsResponseSchema,
  PublicCompanyListResponseSchema,
  PublicContentListResponseSchema,
  PublicPerformanceResultListResponseSchema,
  SessionResponseSchema,
  StoredFileListResponseSchema,
  StoredFileRelationshipsResponseSchema,
  TermListResponseSchema,
} from "@workspace/api-zod";
import { fakeDataPreviewPlugin } from "./fake-data-plugin";

const STUDENT_IDENTITY_ID = "fd010000-0000-4000-8001-000000000001";
const AUDITOR_IDENTITY_ID = "fd010000-0000-4000-8001-000000000014";
const SYSTEM_ADMIN_IDENTITY_ID = "fd010000-0000-4000-8001-000000000013";
const EDUCATION_STAFF_IDENTITY_ID = "fd010000-0000-4000-8001-000000000006";
const BENEFIT_STAFF_IDENTITY_ID = "fd010000-0000-4000-8001-000000000007";
const COMPANY_APPLICANT_IDENTITY_ID = "fd010000-0000-4000-8001-000000000004";
const COMPANY_MANAGER_IDENTITY_ID = "fd010000-0000-4000-8001-000000000005";
const COMPANY_STAFF_IDENTITY_ID = "fd010000-0000-4000-8001-000000000008";
const BUDGET_STAFF_IDENTITY_ID = "fd010000-0000-4000-8001-000000000009";
const PERFORMANCE_STAFF_IDENTITY_ID = "fd010000-0000-4000-8001-000000000010";
const REVIEWER_IDENTITY_ID = "fd010000-0000-4000-8001-000000000012";
const CONTENT_EDITOR_IDENTITY_ID = "fd010000-0000-4000-8001-000000000011";

async function startPreviewServer(dataSetId = "FD_Set_01") {
  let middleware:
    | ((req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>)
    | undefined;
  const plugin = fakeDataPreviewPlugin(dataSetId);
  const configureServer = plugin.configureServer;
  assert.equal(typeof configureServer, "function");
  await configureServer({
    middlewares: { use: (handler: typeof middleware) => (middleware = handler) },
    config: { logger: { error: () => undefined } },
  } as never);
  assert.ok(middleware, "fake-data middleware must be registered");
  const httpServer = createHttpServer((req, res) =>
    middleware!(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  const address = httpServer.address() as AddressInfo | null;
  assert.ok(address, "Vite test server must expose an address");
  return { httpServer, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function login(baseUrl: string, identityId: string) {
  const response = await fetch(`${baseUrl}/api/v1/fake-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityId }),
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  return { response, setCookie, cookie: setCookie.split(";")[0] ?? "" };
}

async function stop(httpServer: HttpServer) {
  await new Promise<void>((resolve, reject) =>
    httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}

test("FD_Set_01 identities expose safe preview metadata", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const response = await fetch(`${baseUrl}/api/v1/fake-auth/identities`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-fake-data-set"), "FD_Set_01");
    const body = FakeIdentityListResponseSchema.parse(await response.json());
    assert.equal(body.data.length, 14);
    assert.deepEqual(
      Object.keys(body.data[0]!).sort(),
      ["defaultRoute", "description", "displayName", "identityId", "roles", "scenarioLabel"].sort(),
    );
  } finally {
    await stop(httpServer);
  }
});

test("login creates a protected cookie and logout revokes the session", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const unauthenticated = await fetch(`${baseUrl}/api/v1/session`);
    assert.equal(unauthenticated.status, 401);

    const { response, setCookie, cookie } = await login(baseUrl, STUDENT_IDENTITY_ID);
    assert.equal(response.status, 200);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);

    const session = await fetch(`${baseUrl}/api/v1/session`, { headers: { Cookie: cookie } });
    assert.equal(session.status, 200);
    const sessionBody = SessionResponseSchema.parse(await session.json());
    assert.deepEqual(sessionBody.user.roles, ["STUDENT"]);
    assert.equal(sessionBody.user.isFakeSession, true);

    const logout = await fetch(`${baseUrl}/api/v1/session/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);

    const replayed = await fetch(`${baseUrl}/api/v1/session`, { headers: { Cookie: cookie } });
    assert.equal(replayed.status, 401);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 public homepage APIs satisfy shared response contracts", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const companies = PublicCompanyListResponseSchema.parse(await (
      await fetch(`${baseUrl}/api/v1/public/companies`)
    ).json());
    const results = PublicPerformanceResultListResponseSchema.parse(await (
      await fetch(`${baseUrl}/api/v1/public/performance-results`)
    ).json());
    const resources = PublicContentListResponseSchema.parse(await (
      await fetch(`${baseUrl}/api/v1/public/content?contentType=RESOURCE&page=1&pageSize=100`)
    ).json());

    assert.ok(companies.data.length > 0);
    assert.ok(results.data.length > 0);
    assert.ok(resources.data.length > 0);
    assert.equal(resources.meta.total, resources.data.length);
  } finally {
    await stop(httpServer);
  }
});

test("invalid login and role-restricted operations are rejected", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const invalid = await login(baseUrl, "not-an-identity");
    assert.equal(invalid.response.status, 401);

    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    const studentReset = await fetch(`${baseUrl}/api/v1/fake-data/reset`, {
      method: "POST",
      headers: { Cookie: student.cookie },
    });
    assert.equal(studentReset.status, 403);

    const auditor = await login(baseUrl, AUDITOR_IDENTITY_ID);
    const auditorMutation = await fetch(`${baseUrl}/api/v1/program-applications`, {
      method: "POST",
      headers: { Cookie: auditor.cookie },
    });
    assert.equal(auditorMutation.status, 403);
    assert.equal(((await auditorMutation.json()) as { error: { code: string } }).error.code, "AUDITOR_READ_ONLY");

    const admin = await login(baseUrl, SYSTEM_ADMIN_IDENTITY_ID);
    const adminReset = await fetch(`${baseUrl}/api/v1/fake-data/reset`, {
      method: "POST",
      headers: { Cookie: admin.cookie },
    });
    assert.equal(adminReset.status, 200);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 role matrix separates read, write, and approval capabilities", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    assert.equal((await fetch(
      `${baseUrl}/api/v1/budget/summary?businessYearId=fd010000-0000-4000-8000-000000000001`,
      { headers: { Cookie: student.cookie } },
    )).status, 403);

    const auditor = await login(baseUrl, AUDITOR_IDENTITY_ID);
    assert.equal((await fetch(`${baseUrl}/api/v1/budget/allocations`, {
      method: "POST",
      headers: { Cookie: auditor.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })).status, 403);

    const reviewer = await login(baseUrl, REVIEWER_IDENTITY_ID);
    assert.equal((await fetch(`${baseUrl}/api/v1/content`, {
      method: "POST",
      headers: { Cookie: reviewer.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })).status, 403);

    const editor = await login(baseUrl, CONTENT_EDITOR_IDENTITY_ID);
    const inReview = "fd010000-0000-4000-8a20-000000000002";
    assert.equal((await fetch(`${baseUrl}/api/v1/content/${inReview}/transition`, {
      method: "POST",
      headers: { Cookie: editor.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    })).status, 403);
  } finally {
    await stop(httpServer);
  }
});

test("education preview supports academic reads and import state transitions", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const education = await login(baseUrl, EDUCATION_STAFF_IDENTITY_ID);
    const curricula = await fetch(`${baseUrl}/api/v1/curricula`, {
      headers: { Cookie: education.cookie },
    });
    assert.equal(curricula.status, 200);
    const curriculumRows = CurriculumListResponseSchema.parse(await curricula.json());
    assert.equal(curriculumRows.data.length, 1);
    const businessYears = await fetch(`${baseUrl}/api/v1/reference/business-years`);
    const businessYearBody = BusinessYearListResponseSchema.parse(await businessYears.json());
    const businessYearId = businessYearBody.data[0]!.id;
    TermListResponseSchema.parse(await (
      await fetch(`${baseUrl}/api/v1/reference/terms?businessYearId=${businessYearId}`)
    ).json());
    CourseListResponseSchema.parse(await (
      await fetch(`${baseUrl}/api/v1/courses?page=1&pageSize=100`)
    ).json());
    const offeringBody = CourseOfferingListResponseSchema.parse(await (
      await fetch(`${baseUrl}/api/v1/course-offerings?businessYearId=${businessYearId}`)
    ).json());
    const requirementBody = CurriculumRequirementListResponseSchema.parse(await (
      await fetch(
        `${baseUrl}/api/v1/curricula/${curriculumRows.data[0]!.id}/requirements`,
        { headers: { Cookie: education.cookie } },
      )
    ).json());
    const offeringId = offeringBody.data[0]!.id;
    const editedOffering = await fetch(`${baseUrl}/api/v1/course-offerings/${offeringId}`, {
      method: "PATCH",
      headers: { Cookie: education.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ sectionCode: "02", capacity: 42, instructorName: "가상교수" }),
    });
    assert.equal(editedOffering.status, 200);
    assert.equal(((await editedOffering.json()) as { capacity: number }).capacity, 42);
    const requirementId = requirementBody.data[0]!.id;
    const editedRequirement = await fetch(`${baseUrl}/api/v1/curriculum-requirements/${requirementId}`, {
      method: "PATCH",
      headers: { Cookie: education.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ operator: "GTE", requiredValue: 21, unit: "학점" }),
    });
    assert.equal(editedRequirement.status, 200);
    assert.equal(Number(((await editedRequirement.json()) as { requiredValue: number }).requiredValue), 21);
    const unpublished = await fetch(
      `${baseUrl}/api/v1/curricula/${curriculumRows.data[0]!.id}`,
      {
        method: "PATCH",
        headers: {
          Cookie: education.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished: false }),
      },
    );
    assert.equal(unpublished.status, 200);
    assert.equal(
      ((await unpublished.json()) as { isPublished: boolean }).isPublished,
      false,
    );
    const staged = await fetch(`${baseUrl}/api/v1/course-imports`, {
      method: "POST",
      headers: {
        Cookie: education.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceSystem: "TEST",
        rows: [
          {
            courseCode: "TEST101",
            name: "테스트 교과목",
            defaultCredits: 3,
            externalId: "TEST101",
          },
        ],
      }),
    });
    assert.equal(staged.status, 201);
    const job = ImportJobSummarySchema.parse(await staged.json());
    assert.equal(job.status, "VALIDATED");
    const preview = await fetch(
      `${baseUrl}/api/v1/course-imports/${job.id}/preview`,
      { method: "POST", headers: { Cookie: education.cookie } },
    );
    assert.equal(ImportJobSummarySchema.parse(await preview.json()).status, "PREVIEWED");
    const commit = await fetch(
      `${baseUrl}/api/v1/course-imports/${job.id}/commit`,
      { method: "POST", headers: { Cookie: education.cookie } },
    );
    assert.equal(ImportJobSummarySchema.parse(await commit.json()).status, "COMMITTED");
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 completion assessments satisfy the shared student contract", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const studentId = "fd010000-0000-4000-8200-000000000001";
    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    const response = await fetch(
      `${baseUrl}/api/v1/completion-assessments?studentId=${studentId}`,
      { headers: { Cookie: student.cookie } },
    );
    assert.equal(response.status, 200);
    const body = CompletionAssessmentListResponseSchema.parse(await response.json());
    assert.equal(body.data[0]?.studentId, studentId);
    assert.equal(body.data[0]?.completed, false);
    assert.ok((body.data[0]?.missing.length ?? 0) > 0);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports student-owned experiential portfolio records", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    const headers = { Cookie: student.cookie, "Content-Type": "application/json" };
    const businessYearId = "fd010000-0000-4000-8000-000000000001";
    const created = await fetch(`${baseUrl}/api/v1/experiential-records`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        businessYearId,
        type: "PROJECT",
        title: "FD_Set_01 포트폴리오",
        status: "SUBMITTED",
        evidence: {
          summary: "학생 본인 프로젝트 기록",
          techStack: ["TypeScript"],
          outputLinks: ["https://example.invalid/portfolio"],
          publicConsent: false,
        },
      }),
    });
    assert.equal(created.status, 201);

    const ownRecords = await fetch(
      `${baseUrl}/api/v1/experiential-records?businessYearId=${businessYearId}&type=PROJECT`,
      { headers },
    );
    assert.equal(ownRecords.status, 200);
    const body = ExperientialRecordListResponseSchema.parse(await ownRecords.json());
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0]?.evidence.publicConsent, false);

    const otherStudent = await login(
      baseUrl,
      "fd010000-0000-4000-8001-000000000002",
    );
    const otherRecords = await fetch(
      `${baseUrl}/api/v1/experiential-records?businessYearId=${businessYearId}&type=PROJECT`,
      { headers: { Cookie: otherStudent.cookie } },
    );
    const otherBody = ExperientialRecordListResponseSchema.parse(
      await otherRecords.json(),
    );
    assert.equal(otherBody.data.length, 0);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports partner participation and consented portfolio evaluation", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const businessYearId = "fd010000-0000-4000-8000-000000000001";
    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    await fetch(`${baseUrl}/api/v1/experiential-records`, {
      method: "POST",
      headers: { Cookie: student.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        businessYearId, type: "PROJECT", title: "기업평가 공개 프로젝트",
        status: "SUBMITTED",
        evidence: {
          summary: "기업 평가용 프로젝트", techStack: ["React"],
          outputLinks: [], publicConsent: true,
        },
      }),
    });

    const manager = await login(baseUrl, COMPANY_MANAGER_IDENTITY_ID);
    const headers = { Cookie: manager.cookie, "Content-Type": "application/json" };
    const candidates = await fetch(`${baseUrl}/api/v1/company-portfolio-candidates`, { headers });
    const candidateBody = CompanyPortfolioCandidateListResponseSchema.parse(await candidates.json());
    assert.equal(candidateBody.data.length, 1);

    const created = await fetch(`${baseUrl}/api/v1/company-participations`, {
      method: "POST", headers,
      body: JSON.stringify({
        businessYearId, participationType: "PROJECT",
        title: "신규 PBL 과제", details: { track: "autonomous" },
      }),
    });
    assert.equal(created.status, 201);
    const projects = await fetch(
      `${baseUrl}/api/v1/company-participations?businessYearId=${businessYearId}&participationType=PROJECT`,
      { headers },
    );
    const projectBody = CompanyParticipationListResponseSchema.parse(await projects.json());
    assert.ok(projectBody.data.some((row) => row.title === "신규 PBL 과제"));
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports performance reviews and source summaries", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const businessYearId = "fd010000-0000-4000-8000-000000000001";
    const staff = await login(baseUrl, PERFORMANCE_STAFF_IDENTITY_ID);
    const headers = { Cookie: staff.cookie, "Content-Type": "application/json" };
    const created = await fetch(`${baseUrl}/api/v1/performance-reviews`, {
      method: "POST", headers,
      body: JSON.stringify({
        businessYearId,
        question: "목표를 달성했는가?",
        answerSummary: "진행 중",
        improvementPlan: "기업 참여를 확대한다.",
        linkedIndicatorIds: [],
        linkedEvidenceIds: [],
      }),
    });
    assert.equal(created.status, 201);

    const reviews = await fetch(
      `${baseUrl}/api/v1/performance-reviews?businessYearId=${businessYearId}`,
      { headers },
    );
    const reviewBody = PerformanceReviewListResponseSchema.parse(await reviews.json());
    assert.equal(reviewBody.data.length, 1);
    const source = await fetch(
      `${baseUrl}/api/v1/performance/source-summary?businessYearId=${businessYearId}`,
      { headers },
    );
    const sourceBody = PerformanceSourceSummaryResponseSchema.parse(await source.json());
    assert.ok(sourceBody.data.some((row) => row.table === "students"));
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports student application and staff selection", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const student = await login(
      baseUrl,
      "fd010000-0000-4000-8001-000000000003",
    );
    const studentId = "fd010000-0000-4000-8200-000000000003";
    const created = await fetch(`${baseUrl}/api/v1/program-applications`, {
      method: "POST",
      headers: { Cookie: student.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "fd010000-0000-4000-8000-000000000212",
        studentId,
        answers: { reason: "FD_Set_01 신청" },
      }),
    });
    assert.equal(created.status, 201);
    const application = (await created.json()) as { id: string; status: string };
    assert.equal(application.status, "SUBMITTED");

    const education = await login(baseUrl, EDUCATION_STAFF_IDENTITY_ID);
    const selected = await fetch(`${baseUrl}/api/v1/program-applications/decision`, {
      method: "POST",
      headers: { Cookie: education.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: application.id, status: "SELECTED" }),
    });
    assert.equal(selected.status, 200);
    const applications = await fetch(
      `${baseUrl}/api/v1/program-applications?studentId=${studentId}`,
      { headers: { Cookie: education.cookie } },
    );
    const body = ProgramApplicationsResponseSchema.parse(await applications.json());
    assert.equal(body.data.find((row) => row.id === application.id)?.status, "SELECTED");
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports versioned performance target creation", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const staff = await login(baseUrl, PERFORMANCE_STAFF_IDENTITY_ID);
    const headers = { Cookie: staff.cookie, "Content-Type": "application/json" };
    const businessYearId = "fd010000-0000-4000-8000-000000000001";
    const indicatorId = "fd010000-0000-4000-8700-000000000001";
    const created = await fetch(`${baseUrl}/api/v1/performance-targets`, {
      method: "POST", headers,
      body: JSON.stringify({
        indicatorId, businessYearId, targetValue: 220,
        version: "2026-v2", rationale: "참여 확대",
      }),
    });
    assert.equal(created.status, 201);
    const overview = await fetch(
      `${baseUrl}/api/v1/performance/overview?businessYearId=${businessYearId}`,
      { headers },
    );
    const body = PerformanceOverviewResponseSchema.parse(await overview.json());
    assert.ok(body.targets.some((row) => row.indicatorId === indicatorId && row.version === "2026-v2"));
  } finally {
    await stop(httpServer);
  }
});

test("education preview supports program operations through completion", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const education = await login(baseUrl, EDUCATION_STAFF_IDENTITY_ID);
    const headers = {
      Cookie: education.cookie,
      "Content-Type": "application/json",
    };
    const draftProgramResponse = await fetch(`${baseUrl}/api/v1/programs`, {
      method: "POST", headers,
      body: JSON.stringify({
        businessYearId: "fd010000-0000-4000-8000-000000000001",
        code: "FD-DRAFT-PROGRAM", name: "편집 검증 프로그램", programType: "WORKSHOP",
        eligibilityRules: { minimumGrade: 2 },
        completionRules: { minimumAttendanceRate: 80, surveyRequired: true },
        sessions: [{
          sequence: 1, name: "편집 검증 1기", capacity: 20,
          applicationStartsAt: "2026-08-01T00:00:00.000Z",
          applicationEndsAt: "2026-08-10T00:00:00.000Z",
          startsAt: "2026-08-20T00:00:00.000Z",
          endsAt: "2026-08-21T00:00:00.000Z",
          venue: "가상 강의실",
        }],
      }),
    });
    assert.equal(draftProgramResponse.status, 201);
    const draftProgram = (await draftProgramResponse.json()) as {
      id: string; programSessions: Array<{ id: string }>;
    };
    const programEdit = await fetch(`${baseUrl}/api/v1/programs/${draftProgram.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ name: "편집 완료 프로그램", eligibilityRules: { minimumGrade: 3 } }),
    });
    assert.equal(programEdit.status, 200);
    const sessionEdit = await fetch(`${baseUrl}/api/v1/program-sessions/${draftProgram.programSessions[0]!.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ capacity: 25, venue: "변경 강의실" }),
    });
    assert.equal(sessionEdit.status, 200);
    assert.equal(((await sessionEdit.json()) as { capacity: number }).capacity, 25);

    const sessionId = "fd010000-0000-4000-8000-000000000211";
    const studentId = "fd010000-0000-4000-8200-000000000001";
    const event = await fetch(`${baseUrl}/api/v1/attendance-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId,
        sequence: 1,
        title: "출석",
        startsAt: "2026-07-27T01:00:00.000Z",
        endsAt: "2026-07-27T02:00:00.000Z",
      }),
    });
    assert.equal(event.status, 201);
    const assignment = await fetch(`${baseUrl}/api/v1/assignments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionId, title: "과제", maxScore: 100 }),
    });
    assert.equal(assignment.status, 201);
    const survey = await fetch(`${baseUrl}/api/v1/surveys`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionId, title: "만족도", schema: {}, isAnonymous: false }),
    });
    assert.equal(survey.status, 201);
    const completion = await fetch(
      `${baseUrl}/api/v1/program-completions/confirm`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, studentId }),
      },
    );
    assert.equal(completion.status, 200);
    const operations = await fetch(
      `${baseUrl}/api/v1/program-operations?sessionId=${sessionId}`,
      { headers },
    );
    const body = ProgramOperationsResponseSchema.parse(await operations.json());
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(body).map(([key, value]) => [key, value.length]),
      ),
      {
        attendanceEvents: 1,
        assignments: 1,
        submissions: 0,
        surveys: 1,
        surveyResponses: 0,
        completions: 1,
        participants: 2,
      },
    );
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports student submission, survey response, and staff grading", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const sessionId = "fd010000-0000-4000-8000-000000000211";
    const studentId = "fd010000-0000-4000-8200-000000000001";
    const education = await login(baseUrl, EDUCATION_STAFF_IDENTITY_ID);
    const educationHeaders = {
      Cookie: education.cookie,
      "Content-Type": "application/json",
    };
    const assignmentResponse = await fetch(`${baseUrl}/api/v1/assignments`, {
      method: "POST",
      headers: educationHeaders,
      body: JSON.stringify({ sessionId, title: "학생 제출 과제", maxScore: 100 }),
    });
    const assignment = (await assignmentResponse.json()) as { id: string };
    const surveyResponse = await fetch(`${baseUrl}/api/v1/surveys`, {
      method: "POST",
      headers: educationHeaders,
      body: JSON.stringify({ sessionId, title: "교육 만족도", schema: {}, isAnonymous: false }),
    });
    const survey = (await surveyResponse.json()) as { id: string };

    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    const studentHeaders = {
      Cookie: student.cookie,
      "Content-Type": "application/json",
    };
    const initialLearning = await fetch(
      `${baseUrl}/api/v1/program-learning?sessionId=${sessionId}&studentId=${studentId}`,
      { headers: studentHeaders },
    );
    assert.equal(initialLearning.status, 200);
    const initialBody = ProgramLearningResponseSchema.parse(await initialLearning.json());
    assert.equal(initialBody.assignments.length, 1);
    assert.equal(initialBody.surveys.length, 1);

    const submitted = await fetch(`${baseUrl}/api/v1/assignment-submissions`, {
      method: "PUT",
      headers: studentHeaders,
      body: JSON.stringify({ assignmentId: assignment.id, studentId, content: "FD_Set_01 제출 내용" }),
    });
    assert.equal(submitted.status, 200);
    const submission = (await submitted.json()) as { id: string };
    const answered = await fetch(`${baseUrl}/api/v1/survey-responses`, {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({ surveyId: survey.id, studentId, answers: { score: 5 } }),
    });
    assert.equal(answered.status, 201);

    const impersonation = await fetch(`${baseUrl}/api/v1/assignment-submissions`, {
      method: "PUT",
      headers: studentHeaders,
      body: JSON.stringify({
        assignmentId: assignment.id,
        studentId: "fd010000-0000-4000-8200-000000000002",
        content: "타인 제출 시도",
      }),
    });
    assert.equal(impersonation.status, 403);

    const operations = await fetch(
      `${baseUrl}/api/v1/program-operations?sessionId=${sessionId}`,
      { headers: educationHeaders },
    );
    const operationsBody = ProgramOperationsResponseSchema.parse(await operations.json());
    assert.equal(operationsBody.submissions.length, 1);
    assert.equal(operationsBody.surveyResponses.length, 1);

    const graded = await fetch(`${baseUrl}/api/v1/assignment-submissions/grade`, {
      method: "POST",
      headers: educationHeaders,
      body: JSON.stringify({ submissionId: submission.id, score: 90, feedback: "확인 완료" }),
    });
    assert.equal(graded.status, 200);
    assert.equal(((await graded.json()) as { score: number }).score, 90);

    const finalLearning = await fetch(
      `${baseUrl}/api/v1/program-learning?sessionId=${sessionId}&studentId=${studentId}`,
      { headers: studentHeaders },
    );
    const finalBody = ProgramLearningResponseSchema.parse(await finalLearning.json());
    assert.equal(finalBody.submissions[0]?.score, 90);
    assert.equal(finalBody.surveyResponses.length, 1);

    const programs = await fetch(`${baseUrl}/api/v1/programs`, {
      headers: studentHeaders,
    });
    assert.equal(programs.status, 200);
    ProgramListResponseSchema.parse(await programs.json());
    const applications = await fetch(
      `${baseUrl}/api/v1/program-applications?studentId=${studentId}`,
      { headers: studentHeaders },
    );
    assert.equal(applications.status, 200);
    ProgramApplicationsResponseSchema.parse(await applications.json());
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports benefit review, approval, and ERP payment status", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const benefit = await login(baseUrl, BENEFIT_STAFF_IDENTITY_ID);
    const headers = {
      Cookie: benefit.cookie,
      "Content-Type": "application/json",
    };
    const initial = await fetch(`${baseUrl}/api/v1/benefit-operations`, { headers });
    assert.equal(initial.status, 200);
    const initialBody = BenefitOperationsResponseSchema.parse(await initial.json());
    const openPolicy = initialBody.policies.find((row) => row.status === "OPEN");
    assert.ok(openPolicy);
    const previewResponse = await fetch(
      `${baseUrl}/api/v1/benefit-candidates/bulk-calculate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ policyId: openPolicy.id, dryRun: true }),
      },
    );
    assert.equal(previewResponse.status, 200);
    const preview = BenefitBulkCalculationResponseSchema.parse(
      await previewResponse.json(),
    );
    assert.equal(preview.evaluated, 3);
    assert.equal(preview.committed, 0);

    const commitResponse = await fetch(
      `${baseUrl}/api/v1/benefit-candidates/bulk-calculate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ policyId: openPolicy.id, dryRun: false }),
      },
    );
    assert.equal(commitResponse.status, 200);
    const commit = BenefitBulkCalculationResponseSchema.parse(
      await commitResponse.json(),
    );
    assert.equal(commit.evaluated, 3);
    assert.equal(commit.committed + commit.skippedDecided, 3);
    assert.ok(commit.skippedDecided >= 1);

    const closedPolicyResponse = await fetch(
      `${baseUrl}/api/v1/benefit-policies/${openPolicy.id}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "CLOSED",
          reason: "2026년도 접수기간 종료",
        }),
      },
    );
    assert.equal(closedPolicyResponse.status, 200);
    const invalidReopen = await fetch(
      `${baseUrl}/api/v1/benefit-policies/${openPolicy.id}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "OPEN",
          reason: "마감 정책 재시행 시도",
        }),
      },
    );
    assert.equal(invalidReopen.status, 409);
    const archivedPolicyResponse = await fetch(
      `${baseUrl}/api/v1/benefit-policies/${openPolicy.id}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "ARCHIVED",
          reason: "사업연도 종료 후 정책 보관",
        }),
      },
    );
    assert.equal(archivedPolicyResponse.status, 200);
    const candidate = initialBody.candidates.find((row) => row.status === "REVIEWING");
    assert.ok(candidate);

    const approvalResponse = await fetch(`${baseUrl}/api/v1/benefit-approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        candidateId: candidate.id,
        decision: "APPROVED",
        approvedAmount: candidate.calculatedAmount,
        note: "FD_Set_01 검토 완료",
      }),
    });
    assert.equal(approvalResponse.status, 201);
    const approval = (await approvalResponse.json()) as { id: string; approvedAmount: number };

    const requested = await fetch(`${baseUrl}/api/v1/benefit-payments`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        approvalId: approval.id,
        amount: approval.approvedAmount,
        status: "REQUESTED",
      }),
    });
    assert.equal(requested.status, 200);
    const paid = await fetch(`${baseUrl}/api/v1/benefit-payments`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        approvalId: approval.id,
        amount: approval.approvedAmount,
        status: "PAID",
        erpReference: "FAKE-ERP-2026-NEW",
        paidAt: "2026-07-27T03:00:00.000Z",
      }),
    });
    assert.equal(paid.status, 200);

    const final = await fetch(`${baseUrl}/api/v1/benefit-operations`, { headers });
    const finalBody = BenefitOperationsResponseSchema.parse(await final.json());
    assert.equal(
      finalBody.policies.find((row) => row.id === openPolicy.id)?.status,
      "ARCHIVED",
    );
    assert.equal(finalBody.candidates.find((row) => row.id === candidate.id)?.status, "APPROVED");
    assert.ok(finalBody.approvals.some((row) => row.id === approval.id));
    assert.equal(finalBody.payments.find((row) => row.approvalId === approval.id)?.status, "PAID");
    assert.equal(finalBody.payments.find((row) => row.approvalId === approval.id)?.erpReference, "FAKE-ERP-2026-NEW");
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports company supplement, resubmission, approval, and commitment", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const applicant = await login(baseUrl, COMPANY_APPLICANT_IDENTITY_ID);
    const applicantHeaders = { Cookie: applicant.cookie, "Content-Type": "application/json" };
    const ownApplications = await fetch(`${baseUrl}/api/v1/company-applications`, { headers: applicantHeaders });
    assert.equal(ownApplications.status, 200);
    const ownBody = CompanyApplicationsResponseSchema.parse(await ownApplications.json());
    const supplement = ownBody.data.find((row) => row.status === "SUPPLEMENT_REQUESTED");
    assert.ok(supplement);
    const applicationInput = {
      businessYearId: "fd010000-0000-4000-8000-000000000001",
      companyName: "가상모빌리티신청기업01 보완",
      registrationNumber: "FAKE-BIZ-RESUBMIT-01",
      companyType: "중소기업",
      description: "보완 완료",
      website: "https://example.invalid/company",
      contact: { name: "가상 신청담당자", email: "applicant@example.invalid" },
      participationTypes: ["PROJECT", "INTERNSHIP"],
    };
    const resubmitted = await fetch(`${baseUrl}/api/v1/company-applications/${supplement.id}`, {
      method: "PUT", headers: applicantHeaders, body: JSON.stringify(applicationInput),
    });
    assert.equal(resubmitted.status, 200);
    assert.equal(((await resubmitted.json()) as { status: string }).status, "SUBMITTED");

    const staff = await login(baseUrl, COMPANY_STAFF_IDENTITY_ID);
    const staffHeaders = { Cookie: staff.cookie, "Content-Type": "application/json" };
    const companyListResponse = await fetch(`${baseUrl}/api/v1/companies`, { headers: staffHeaders });
    const companyList = CompanyListResponseSchema.parse(await companyListResponse.json());
    const company = companyList.data[0];
    assert.ok(company);
    const updatedCompany = await fetch(`${baseUrl}/api/v1/companies/${company.id}`, {
      method: "PATCH", headers: staffHeaders,
      body: JSON.stringify({ isPublic: false, description: "운영정보 갱신" }),
    });
    assert.equal(updatedCompany.status, 200);
    const contactResponse = await fetch(`${baseUrl}/api/v1/companies/${company.id}/contacts`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({ name: "신규 대표담당자", email: "new-contact@example.invalid", isPrimary: true }),
    });
    assert.equal(contactResponse.status, 201);
    const contact = (await contactResponse.json()) as { id: string };
    const expertResponse = await fetch(`${baseUrl}/api/v1/companies/${company.id}/experts`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({ name: "신규 AI 전문가", specialty: "생성형 AI", profile: {} }),
    });
    assert.equal(expertResponse.status, 201);
    const expert = (await expertResponse.json()) as { id: string };
    const inactiveExpert = await fetch(`${baseUrl}/api/v1/company-experts/${expert.id}/status`, {
      method: "PATCH", headers: staffHeaders, body: JSON.stringify({ isActive: false }),
    });
    assert.equal(inactiveExpert.status, 200);
    const archivedContact = await fetch(`${baseUrl}/api/v1/company-contacts/${contact.id}`, {
      method: "DELETE", headers: staffHeaders,
    });
    assert.equal(archivedContact.status, 200);

    const approved = await fetch(`${baseUrl}/api/v1/company-applications/${supplement.id}/decision`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({ decision: "APPROVED", note: "검토 완료" }),
    });
    assert.equal(approved.status, 200);
    assert.equal(((await approved.json()) as { application: { status: string } }).application.status, "APPROVED");

    const manager = await login(baseUrl, COMPANY_MANAGER_IDENTITY_ID);
    const commitment = await fetch(`${baseUrl}/api/v1/company-commitments`, {
      method: "POST",
      headers: { Cookie: manager.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        businessYearId: "fd010000-0000-4000-8000-000000000001",
        fileId: "fd010000-0000-4000-8800-000000000001",
        signedAt: "2026-07-27T03:00:00.000Z",
        expiresAt: "2027-07-27T03:00:00.000Z",
      }),
    });
    assert.equal(commitment.status, 201);

    const operations = await fetch(`${baseUrl}/api/v1/company-applications`, { headers: staffHeaders });
    const operationsBody = CompanyApplicationsResponseSchema.parse(await operations.json());
    assert.equal(operationsBody.data.find((row) => row.id === supplement.id)?.status, "APPROVED");
    assert.equal(operationsBody.commitments.length, 1);
    const finalCompaniesResponse = await fetch(`${baseUrl}/api/v1/companies`, { headers: staffHeaders });
    const finalCompanies = CompanyListResponseSchema.parse(await finalCompaniesResponse.json());
    const finalCompany = finalCompanies.data.find((row) => row.id === company.id);
    assert.equal(finalCompany?.isPublic, false);
    assert.ok(finalCompany?.companyContacts.every((row) => row.id !== contact.id));
    assert.equal(finalCompany?.companyExperts.find((row) => row.id === expert.id)?.isActive, false);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 supports budget allocation, execution, references, and amount history", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const budget = await login(baseUrl, BUDGET_STAFF_IDENTITY_ID);
    const headers = { Cookie: budget.cookie, "Content-Type": "application/json" };
    const businessYearId = "fd010000-0000-4000-8000-000000000001";
    const createdResponse = await fetch(`${baseUrl}/api/v1/budget/allocations`, {
      method: "POST", headers,
      body: JSON.stringify({
        businessYearId, budgetCode: "FD-BUDGET-NEW", category: "현장실습비",
        allocatedAmount: 50000000, plannedAmount: 40000000,
        internalApprovalNumber: "IA-FD-001", erpReference: "ERP-FD-001", rcmsReference: "RCMS-FD-001",
      }),
    });
    assert.equal(createdResponse.status, 201);
    const allocation = (await createdResponse.json()) as { id: string };
    const execution = await fetch(`${baseUrl}/api/v1/budget/executions`, {
      method: "POST", headers,
      body: JSON.stringify({
        allocationId: allocation.id, amount: 10000000, purpose: "인턴십 운영",
        executedAt: "2026-07-27T03:00:00.000Z",
        evidenceFileId: "fd010000-0000-4000-8800-000000000001",
        internalApprovalNumber: "IA-EXEC-001", erpReference: "ERP-EXEC-001", rcmsReference: "RCMS-EXEC-001",
      }),
    });
    assert.equal(execution.status, 201);
    const invalidEvidence = await fetch(`${baseUrl}/api/v1/budget/executions`, {
      method: "POST", headers,
      body: JSON.stringify({
        allocationId: allocation.id, amount: 1000, purpose: "존재하지 않는 증빙",
        executedAt: "2026-07-27T03:00:00.000Z",
        evidenceFileId: "fd010000-0000-4000-8800-999999999999",
      }),
    });
    assert.equal(invalidEvidence.status, 422);
    const exceeded = await fetch(`${baseUrl}/api/v1/budget/executions`, {
      method: "POST", headers,
      body: JSON.stringify({
        allocationId: allocation.id, amount: 50000000, purpose: "잔액초과",
        executedAt: "2026-07-27T03:00:00.000Z",
      }),
    });
    assert.equal(exceeded.status, 409);
    const changed = await fetch(`${baseUrl}/api/v1/budget/amount-changes`, {
      method: "POST", headers,
      body: JSON.stringify({
        allocationId: allocation.id, field: "plannedAmount",
        newAmount: 45000000, reason: "인턴십 인원 확대",
      }),
    });
    assert.equal(changed.status, 200);
    const operations = await fetch(`${baseUrl}/api/v1/budget/operations?businessYearId=${businessYearId}`, { headers });
    const operationsBody = (await operations.json()) as {
      allocations: Array<{ id: string; erpReference?: string; rcmsReference?: string }>;
      executions: Array<{ allocationId: string; evidenceFileId?: string }>;
    };
    assert.equal(operationsBody.allocations.find((row) => row.id === allocation.id)?.erpReference, "ERP-FD-001");
    assert.equal(operationsBody.allocations.find((row) => row.id === allocation.id)?.rcmsReference, "RCMS-FD-001");
    assert.equal(operationsBody.executions.find((row) => row.allocationId === allocation.id)?.evidenceFileId, "fd010000-0000-4000-8800-000000000001");
    const history = await fetch(`${baseUrl}/api/v1/budget/change-history`, { headers });
    const historyBody = BudgetChangeHistoryResponseSchema.parse(await history.json());
    assert.equal(historyBody.data.find((row) => row.allocationId === allocation.id)?.reason, "인턴십 인원 확대");
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 requires evidence before performance public approval", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const businessYearId = "fd010000-0000-4000-8000-000000000001";
    const indicatorId = "fd010000-0000-4000-8700-000000000002";
    const resultId = "fd010000-0000-4000-8720-000000000002";
    const staff = await login(baseUrl, PERFORMANCE_STAFF_IDENTITY_ID);
    const staffHeaders = { Cookie: staff.cookie, "Content-Type": "application/json" };
    const indicatorResponse = await fetch(`${baseUrl}/api/v1/performance-indicators`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({
        code: "FD-KPI-DB-COUNT", name: "DB 학생 수", category: "교육", unit: "명",
        calculationFormula: { type: "COUNT", source: "STUDENTS" },
      }),
    });
    assert.equal(indicatorResponse.status, 201);
    const calculatedIndicator = (await indicatorResponse.json()) as { id: string };
    const calculationPreviewResponse = await fetch(`${baseUrl}/api/v1/performance-results/calculate`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({ indicatorId: calculatedIndicator.id, businessYearId, dryRun: true }),
    });
    const calculationPreview = PerformanceCalculationResponseSchema.parse(await calculationPreviewResponse.json());
    assert.equal(calculationPreview.actualValue, 3);
    assert.equal(calculationPreview.resultId, null);
    const calculationCommitResponse = await fetch(`${baseUrl}/api/v1/performance-results/calculate`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({ indicatorId: calculatedIndicator.id, businessYearId, dryRun: false }),
    });
    const calculationCommit = PerformanceCalculationResponseSchema.parse(await calculationCommitResponse.json());
    assert.ok(calculationCommit.resultId);

    const saved = await fetch(`${baseUrl}/api/v1/performance-results`, {
      method: "PUT", headers: staffHeaders,
      body: JSON.stringify({
        indicatorId, businessYearId, actualValue: 27,
        calculationSnapshot: { formula: "approved_company_count", sourceCount: 27 },
      }),
    });
    assert.equal(saved.status, 200);
    assert.equal(((await saved.json()) as { status: string }).status, "DRAFT");
    const submitted = await fetch(`${baseUrl}/api/v1/performance-results/${resultId}/submit-review`, {
      method: "POST", headers: staffHeaders,
    });
    assert.equal(submitted.status, 200);

    const reviewer = await login(baseUrl, REVIEWER_IDENTITY_ID);
    const reviewerHeaders = { Cookie: reviewer.cookie, "Content-Type": "application/json" };
    const blocked = await fetch(`${baseUrl}/api/v1/performance-results/${resultId}/approve-public`, {
      method: "POST", headers: reviewerHeaders,
    });
    assert.equal(blocked.status, 409);
    assert.equal(((await blocked.json()) as { error: { code: string } }).error.code, "PERFORMANCE_EVIDENCE_REQUIRED");

    const evidence = await fetch(`${baseUrl}/api/v1/performance-evidence`, {
      method: "POST", headers: staffHeaders,
      body: JSON.stringify({
        resultId,
        fileId: "fd010000-0000-4000-8800-000000000001",
        description: "참여기업 집계 증빙",
      }),
    });
    assert.equal(evidence.status, 201);
    const approved = await fetch(`${baseUrl}/api/v1/performance-results/${resultId}/approve-public`, {
      method: "POST", headers: reviewerHeaders,
    });
    assert.equal(approved.status, 200);
    assert.equal(((await approved.json()) as { status: string }).status, "PUBLISHED");

    const overview = await fetch(
      `${baseUrl}/api/v1/performance/overview?businessYearId=${businessYearId}`,
      { headers: reviewerHeaders },
    );
    assert.equal(overview.status, 200);
    const overviewBody = PerformanceOverviewResponseSchema.parse(await overview.json());
    assert.equal(overviewBody.results.find((row) => row.id === resultId)?.status, "PUBLISHED");

    const published = await fetch(`${baseUrl}/api/v1/public/performance-results`);
    const publishedBody = (await published.json()) as {
      data: Array<{ id: string; actualValue: string }>;
    };
    assert.equal(publishedBody.data.find((row) => row.id === resultId)?.actualValue, "27");
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 enforces CMS review roles and scheduled publication visibility", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const editor = await login(baseUrl, CONTENT_EDITOR_IDENTITY_ID);
    const editorHeaders = { Cookie: editor.cookie, "Content-Type": "application/json" };
    const createdResponse = await fetch(`${baseUrl}/api/v1/content`, {
      method: "POST", headers: editorHeaders,
      body: JSON.stringify({
        contentType: "RESOURCE", slug: "fd-scheduled-resource",
        title: "예약 자료", summary: "예약발행 검증", body: "예약 자료 본문",
        metadata: { source: "FD_Set_01" }, isPinned: false,
        attachmentFileIds: ["fd010000-0000-4000-8800-000000000001"],
      }),
    });
    assert.equal(createdResponse.status, 201);
    const item = (await createdResponse.json()) as { id: string };
    const updated = await fetch(`${baseUrl}/api/v1/content/${item.id}`, {
      method: "PATCH", headers: editorHeaders,
      body: JSON.stringify({
        title: "예약 자료 수정본",
        body: "예약 자료 수정 본문",
        changeSummary: "검토 요청 전 문구 수정",
      }),
    });
    assert.equal(updated.status, 200);
    const versionsResponse = await fetch(`${baseUrl}/api/v1/content/${item.id}/versions`, {
      headers: editorHeaders,
    });
    const versions = ContentVersionListResponseSchema.parse(await versionsResponse.json());
    assert.deepEqual(versions.data.map((row) => row.version), [2, 1]);
    assert.equal(versions.data[0]?.changeSummary, "검토 요청 전 문구 수정");
    const submitted = await fetch(`${baseUrl}/api/v1/content/${item.id}/transition`, {
      method: "POST", headers: editorHeaders, body: JSON.stringify({ action: "SUBMIT_REVIEW" }),
    });
    assert.equal(submitted.status, 200);
    const editorApproval = await fetch(`${baseUrl}/api/v1/content/${item.id}/transition`, {
      method: "POST", headers: editorHeaders, body: JSON.stringify({ action: "APPROVE" }),
    });
    assert.equal(editorApproval.status, 403);

    const reviewer = await login(baseUrl, REVIEWER_IDENTITY_ID);
    const reviewerHeaders = { Cookie: reviewer.cookie, "Content-Type": "application/json" };
    const approved = await fetch(`${baseUrl}/api/v1/content/${item.id}/transition`, {
      method: "POST", headers: reviewerHeaders, body: JSON.stringify({ action: "APPROVE" }),
    });
    assert.equal(approved.status, 200);
    const reviewerPublish = await fetch(`${baseUrl}/api/v1/content/${item.id}/transition`, {
      method: "POST", headers: reviewerHeaders, body: JSON.stringify({ action: "PUBLISH" }),
    });
    assert.equal(reviewerPublish.status, 403);

    const scheduledAt = new Date(Date.now() + 3600000).toISOString();
    const scheduled = await fetch(`${baseUrl}/api/v1/content/${item.id}/transition`, {
      method: "POST", headers: editorHeaders,
      body: JSON.stringify({ action: "PUBLISH", publishAt: scheduledAt }),
    });
    assert.equal(scheduled.status, 200);
    const publishedUpdate = await fetch(`${baseUrl}/api/v1/content/${item.id}`, {
      method: "PATCH", headers: editorHeaders,
      body: JSON.stringify({ title: "공개 후 직접 수정", changeSummary: "차단 검증" }),
    });
    assert.equal(publishedUpdate.status, 409);
    const internal = await fetch(`${baseUrl}/api/v1/content`, { headers: editorHeaders });
    const internalBody = (await internal.json()) as {
      data: Array<{ id: string; status: string; publishedAt?: string }>;
      attachments: Array<{ contentId: string }>;
    };
    assert.equal(internalBody.data.find((row) => row.id === item.id)?.status, "PUBLISHED");
    assert.equal(internalBody.data.find((row) => row.id === item.id)?.publishedAt, scheduledAt);
    assert.ok(internalBody.attachments.some((row) => row.contentId === item.id));
    const publicContent = await fetch(`${baseUrl}/api/v1/public/content?contentType=RESOURCE`);
    const publicBody = (await publicContent.json()) as { data: Array<{ id: string }> };
    assert.equal(publicBody.data.some((row) => row.id === item.id), false);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 enforces file relationships, download access, archive safety, and audit", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const linkedFileId = "fd010000-0000-4000-8800-000000000001";
    const unlinkedFileId = "fd010000-0000-4000-8800-000000000002";
    const budget = await login(baseUrl, BUDGET_STAFF_IDENTITY_ID);
    const files = await fetch(`${baseUrl}/api/v1/files`, {
      headers: { Cookie: budget.cookie },
    });
    assert.equal(files.status, 200);
    StoredFileListResponseSchema.parse(await files.json());
    const relationships = await fetch(`${baseUrl}/api/v1/files/${linkedFileId}/relationships`, {
      headers: { Cookie: budget.cookie },
    });
    assert.equal(relationships.status, 200);
    const relationshipBody = StoredFileRelationshipsResponseSchema.parse(
      await relationships.json(),
    );
    assert.ok(relationshipBody.relations.some((row) => row.relationType === "BUDGET_EXECUTION"));
    const download = await fetch(`${baseUrl}/api/v1/files/${linkedFileId}/download`, {
      headers: { Cookie: budget.cookie },
    });
    assert.equal(download.status, 200);
    assert.match(download.headers.get("content-disposition") ?? "", /attachment/i);
    assert.match(await download.text(), /^%PDF-/);

    const student = await login(baseUrl, STUDENT_IDENTITY_ID);
    const denied = await fetch(`${baseUrl}/api/v1/files/${linkedFileId}/download`, {
      headers: { Cookie: student.cookie },
    });
    assert.equal(denied.status, 403);

    const admin = await login(baseUrl, SYSTEM_ADMIN_IDENTITY_ID);
    const inUse = await fetch(`${baseUrl}/api/v1/files/${linkedFileId}`, {
      method: "DELETE", headers: { Cookie: admin.cookie },
    });
    assert.equal(inUse.status, 409);
    const archived = await fetch(`${baseUrl}/api/v1/files/${unlinkedFileId}`, {
      method: "DELETE", headers: { Cookie: admin.cookie },
    });
    assert.equal(archived.status, 204);
    const operations = await fetch(`${baseUrl}/api/v1/fake-data/operations`, {
      headers: { Cookie: admin.cookie },
    });
    const operationsBody = FakeOperationsResponseSchema.parse(await operations.json());
    assert.ok(operationsBody.auditLogs.some((row) => row.action === "DOWNLOAD" && row.entityId === linkedFileId));
    assert.ok(operationsBody.auditLogs.some((row) => row.action === "ARCHIVE" && row.entityId === unlinkedFileId));
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 exposes contract-valid audit reads and purpose-bound CSV export", async () => {
  const { httpServer, baseUrl } = await startPreviewServer();
  try {
    const auditor = await login(baseUrl, AUDITOR_IDENTITY_ID);
    const headers = {
      Cookie: auditor.cookie,
      "Content-Type": "application/json",
    };
    const deniedWrite = await fetch(`${baseUrl}/api/v1/benefit-approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(deniedWrite.status, 403);

    const response = await fetch(
      `${baseUrl}/api/v1/audit-logs?page=1&pageSize=20`,
      { headers },
    );
    assert.equal(response.status, 200);
    const logs = AuditLogListResponseSchema.parse(await response.json());
    assert.ok(logs.data.some((row) => row.action === "ACCESS_DENIED"));

    const exported = await fetch(`${baseUrl}/api/v1/audit-logs/export`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        purpose: "정기 접근통제 점검",
        filters: {
          startAt: "2026-01-01T00:00:00.000Z",
          endAt: "2026-12-31T23:59:59.999Z",
        },
      }),
    });
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(await exported.text(), /ACCESS_DENIED/);
  } finally {
    await stop(httpServer);
  }
});

test("FD_Set_01 identity references and default routes remain internally consistent", async () => {
  const fixtureUrl = new URL("../fake-data/FD_Set_01.json", import.meta.url);
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8")) as {
    dataSetId: string;
    fakeAuth: { enabled: boolean; identities: Array<{ id: string; userId: string; roles: string[]; defaultRoute: string }> };
    users: Array<{ id: string }>;
  };
  const allowedRoutes = new Set([
    "/student/dashboard",
    "/student/completion",
    "/partner/dashboard",
    "/admin/dashboard",
    "/admin/partners",
    "/admin/budget",
    "/admin/performance",
  ]);
  const userIds = new Set(fixture.users.map((user) => user.id));

  assert.equal(fixture.dataSetId, "FD_Set_01");
  assert.equal(fixture.fakeAuth.enabled, true);
  assert.equal(new Set(fixture.fakeAuth.identities.map((identity) => identity.id)).size, 14);
  for (const identity of fixture.fakeAuth.identities) {
    assert.ok(userIds.has(identity.userId), `missing user for ${identity.id}`);
    assert.ok(identity.roles.length > 0, `missing role for ${identity.id}`);
    assert.ok(allowedRoutes.has(identity.defaultRoute), `unknown default route ${identity.defaultRoute}`);
  }
});

test("production mode refuses to mount fake authentication", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await assert.rejects(
      () => startPreviewServer("FD_Set_01"),
      /restricted to FD_Set_01 development mode/,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});
