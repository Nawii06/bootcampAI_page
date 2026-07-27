import assert from "node:assert/strict";
import test from "node:test";
import {
  BenefitOperationsResponseSchema,
  CompanyApplicationsResponseSchema,
  CompanyListResponseSchema,
  CompanyParticipationListResponseSchema,
  CompanyPortfolioCandidateListResponseSchema,
  CompletionAssessmentListResponseSchema,
  CourseListResponseSchema,
  ExperientialRecordListResponseSchema,
  ImportJobSummarySchema,
  PerformanceOverviewResponseSchema,
  PerformanceReviewListResponseSchema,
  PerformanceSourceSummaryResponseSchema,
  ProgramLearningResponseSchema,
  ProgramOperationsResponseSchema,
  StoredFileRelationshipsResponseSchema,
  PublicCompanyListResponseSchema,
  PublicContentListResponseSchema,
  PublicPerformanceResultListResponseSchema,
} from "@workspace/api-zod";

const id = (suffix: string) => `fd010000-0000-4000-8000-${suffix.padStart(12, "0")}`;

test("benefit operations response preserves monetary values and references", () => {
  const parsed = BenefitOperationsResponseSchema.parse({
    policies: [{ id: id("1"), code: "SCHOLARSHIP", name: "장학금", status: "OPEN" }],
    candidates: [{
      id: id("2"), policyId: id("1"), studentId: id("3"),
      calculatedAmount: "1200000", status: "REVIEWING",
    }],
    approvals: [{
      id: id("4"), candidateId: id("2"), approvedAmount: "1200000",
      decision: "APPROVED",
    }],
    payments: [{
      id: id("5"), approvalId: id("4"), amount: "1200000",
      status: "PAID", erpReference: "ERP-2026-001",
    }],
    students: [{ id: id("3"), studentNumber: "20260001", name: "테스트 학생" }],
  });

  assert.equal(parsed.payments[0]?.erpReference, "ERP-2026-001");
});

test("company list and applicant operations share validated identities", () => {
  assert.equal(CompanyListResponseSchema.safeParse({
    data: [{
      id: id("10"), name: "테스트 기업", companyType: "SME",
      isPublic: true, isActive: true,
      companyContacts: [], companyExperts: [], companyParticipations: [],
    }],
  }).success, true);

  assert.equal(CompanyApplicationsResponseSchema.safeParse({
    data: [{
      id: id("11"), companyName: "테스트 기업", status: "SUBMITTED",
      applicationData: { participationTypes: ["PROJECT"] },
    }],
    commitments: [],
  }).success, true);
});

test("performance overview rejects results without an indicator relationship", () => {
  const result = PerformanceOverviewResponseSchema.safeParse({
    indicators: [],
    targets: [],
    results: [{
      id: id("20"), actualValue: "10", status: "DRAFT",
      updatedAt: "2026-07-27T00:00:00.000Z",
    }],
    evidence: [],
  });

  assert.equal(result.success, false);
});

test("program operations require participant and learning relationship keys", () => {
  assert.equal(ProgramOperationsResponseSchema.safeParse({
    attendanceEvents: [],
    assignments: [],
    surveys: [],
    completions: [],
    participants: [{ id: id("30"), studentId: id("31"), status: "SELECTED" }],
    submissions: [],
    surveyResponses: [],
  }).success, true);

  assert.equal(ProgramLearningResponseSchema.safeParse({
    assignments: [{ id: id("32"), title: "과제" }],
    submissions: [{ id: id("33") }],
    surveys: [],
    surveyResponses: [],
  }).success, false);
});

test("file relationship responses require a concrete related resource", () => {
  const result = StoredFileRelationshipsResponseSchema.safeParse({
    file: {
      id: id("40"),
      originalName: "evidence.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      containsPersonalInfo: false,
    },
    relations: [{ relationType: "BUDGET_EXECUTION" }],
  });

  assert.equal(result.success, false);
});

test("academic and import responses retain operational metadata", () => {
  assert.equal(CourseListResponseSchema.safeParse({
    data: [{
      id: id("50"),
      courseCode: "AI101",
      name: "인공지능 기초",
      defaultCredits: 3,
      isActive: true,
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
    }],
    meta: { page: 1, pageSize: 100, total: 1 },
  }).success, true);

  assert.equal(ImportJobSummarySchema.safeParse({
    id: id("51"),
    status: "PREVIEWED",
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    insertRows: 1,
    updateRows: 0,
    unchangedRows: 0,
  }).success, true);
});

test("completion responses require calculated requirement facts", () => {
  const result = CompletionAssessmentListResponseSchema.safeParse({
    data: [{
      id: id("60"),
      studentId: id("61"),
      completed: false,
      progressRate: "50",
      satisfied: [],
      missing: [{ id: "REQ-1", name: "필수학점", required: 3, shortage: 3 }],
      calculatedAt: "2026-07-27T00:00:00.000Z",
    }],
  });

  assert.equal(result.success, false);
});

test("experiential records retain evidence and public-consent state", () => {
  const parsed = ExperientialRecordListResponseSchema.parse({
    data: [{
      id: id("70"),
      studentId: id("71"),
      businessYearId: id("72"),
      type: "PROJECT",
      title: "AI 프로젝트",
      status: "SUBMITTED",
      evidence: {
        summary: "프로젝트 수행 결과",
        techStack: ["TypeScript"],
        outputLinks: ["https://example.invalid/project"],
        publicConsent: false,
      },
      createdAt: "2026-07-27T00:00:00.000Z",
    }],
  });

  assert.equal(parsed.data[0]?.evidence.publicConsent, false);
});

test("public homepage contracts expose only renderable summary fields", () => {
  assert.equal(PublicCompanyListResponseSchema.safeParse({
    data: [{ id: id("80"), name: "참여기업", companyType: "SME" }],
  }).success, true);
  assert.equal(PublicPerformanceResultListResponseSchema.safeParse({
    data: [{
      id: id("81"), indicatorCode: "KPI-1", indicatorName: "이수율",
      actualValue: "90", unit: "%",
    }],
  }).success, true);
  assert.equal(PublicContentListResponseSchema.safeParse({
    data: [{ id: id("82"), title: "자료", body: "본문" }],
    meta: { page: 1, pageSize: 20, total: 1 },
  }).success, true);
});

test("partner contracts preserve company ownership and student consent candidates", () => {
  assert.equal(CompanyParticipationListResponseSchema.safeParse({
    company: { id: id("90"), name: "참여기업", companyType: "SME" },
    data: [{
      id: id("91"), participationType: "PROJECT", title: "PBL",
      details: { track: "autonomous" },
      createdAt: "2026-07-27T00:00:00.000Z",
    }],
  }).success, true);
  assert.equal(CompanyPortfolioCandidateListResponseSchema.safeParse({
    data: [{
      id: id("92"), studentId: id("93"), title: "학생 프로젝트",
      evidence: { summary: "공개 동의 프로젝트", techStack: [], outputLinks: [] },
    }],
  }).success, true);
});

test("performance review and source contracts retain audit-ready fields", () => {
  assert.equal(PerformanceReviewListResponseSchema.safeParse({
    data: [{
      id: id("94"), question: "목표 달성 여부", answerSummary: "진행 중",
      improvementPlan: "참여 확대", status: "DRAFT",
      createdAt: "2026-07-27T00:00:00.000Z",
    }],
  }).success, true);
  assert.equal(PerformanceSourceSummaryResponseSchema.safeParse({
    data: [{
      id: "students", domain: "STUDENT", table: "students",
      count: 3, yearScoped: false,
    }],
  }).success, true);
});
