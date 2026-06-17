import type {
  EvidenceFile,
  IndicatorEvidenceMap,
  PerformanceIndicator,
  PerformanceResult,
  SourceCompanyData,
  SourceEmploymentData,
  SourceProgramData,
  SourceStudentData,
  TargetVersion
} from "./types";

const now = "2026-06-17T10:30:00+09:00";
const commonEvidence = ["성과 산출근거", "담당부서 확인자료", "평가 제출용 요약표"];

function indicator(
  no: number,
  name: string,
  category: string,
  unit: string,
  aggregation: PerformanceIndicator["aggregation_type"],
  targets: PerformanceIndicator["targets"],
  increments: PerformanceIndicator["target_increments"] = [null, null, null, null, null],
  options: Partial<PerformanceIndicator> = {}
): PerformanceIndicator {
  return {
    id: `pi-${String(no).padStart(2, "0")}`,
    indicator_code: `${options.indicator_type === "autonomous" ? "A" : "C"}-${String(no).padStart(2, "0")}`,
    indicator_type: options.indicator_type ?? "common",
    category,
    area: options.area ?? category,
    sub_area: options.sub_area,
    indicator_name: name,
    unit,
    baseline_value: options.baseline_value ?? null,
    aggregation_type: aggregation,
    targets,
    target_increments: increments,
    definition: options.definition ?? `${name} 목표 및 실적을 관리하는 성과지표입니다.`,
    formula: options.formula ?? (aggregation === "rate" ? "분자 / 분모 * 100" : "실적값 / 목표값 * 100"),
    measurement_method: options.measurement_method ?? "연차별 실적 입력값과 승인된 증빙자료 기준으로 산정",
    required_evidence: options.required_evidence ?? commonEvidence,
    source: "성과지표 목표설정 총괄표",
    source_page: options.source_page ?? "v1",
    version: options.version ?? "총괄표 기준 v1",
    is_active: true,
    remarks: options.remarks,
    created_at: now,
    updated_at: now
  };
}

export const performanceIndicatorsSeed: PerformanceIndicator[] = [
  indicator(1, "부트캠프사업단 전담 인력 수", "사업지원체계", "명", "cumulative", [11, 13, 13, 13, 13], [null, 2, 0, 0, 0], { required_evidence: ["인사명령서", "업무분장표", "조직도"] }),
  indicator(2, "제도 개선 건수", "사업지원체계", "건", "cumulative", [7, 9, 9, 9, 9], [null, 2, 0, 0, 0], { required_evidence: ["학칙 개정 전·후 비교표", "안건자료"] }),
  indicator(3, "참여기업 수", "사업지원체계", "개", "cumulative", [45, 45, 47, 50, 50], [null, 0, 2, 3, 0], { required_evidence: ["사업 참여의사 확인서", "참여기업 활동내역"] }),
  indicator(4, "전임교원", "교육인프라", "명", "cumulative", [43, 43, 44, 45, 45], [null, 1, 1, 0, 0], { sub_area: "참여교원", required_evidence: ["참여교원 명단"] }),
  indicator(5, "비전임교원", "교육인프라", "명", "cumulative", [2, 4, 4, 4, 4], [null, 2, 0, 0, 0], { sub_area: "참여교원" }),
  indicator(6, "산학협력중점", "교육인프라", "명", "cumulative", [1, 1, 1, 1, 1], [null, 0, 0, 0, 0], { sub_area: "참여교원" }),
  indicator(7, "몰입형 초급", "교육프로그램 운영", "건", "cumulative", [1, 1, 1, 1, 1], [null, 0, 0, 0, 0], { sub_area: "몰입형" }),
  indicator(8, "몰입형 중급", "교육프로그램 운영", "건", "cumulative", [2, 4, 4, 4, 4], [null, 2, 0, 0, 0], { sub_area: "몰입형" }),
  indicator(9, "몰입형 고급", "교육프로그램 운영", "건", "cumulative", [1, 3, 4, 4, 4], [null, 2, 1, 0, 0], { sub_area: "몰입형" }),
  indicator(10, "교과형 초급", "교육프로그램 운영", "건", "cumulative", [null, null, null, null, null], [null, null, null, null, null], { sub_area: "교과형" }),
  indicator(11, "교과형 중급", "교육프로그램 운영", "건", "cumulative", [null, 1, 1, 1, 1], [null, null, 0, 0, 0], { sub_area: "교과형" }),
  indicator(12, "교과형 고급", "교육프로그램 운영", "건", "cumulative", [null, null, null, null, null], [null, null, null, null, null], { sub_area: "교과형" }),
  indicator(13, "교과목 개발", "교육프로그램 운영", "건", "cumulative", [12, 26, 32, 32, 32], [null, 14, 6, 0, 0], { required_evidence: ["강의계획서", "교과목 개발 보고서"] }),
  indicator(14, "양성인원", "인재양성", "명", "annual", [100, 120, 130, 140, 150], [null, null, null, null, null], { baseline_value: 100, required_evidence: ["이수증 발급자 명단"] }),
  indicator(15, "중·고급 이수자", "인재양성", "명", "annual", [60, 75, 80, 85, 90], [null, null, null, null, null], { baseline_value: "60% 이상", remarks: "각 연도별 양성인원 대비 60% 이상이어야 함" }),
  indicator(16, "배출인원", "인재양성", "명", "annual", [20, 50, 100, 110, 130], [null, null, null, null, null], { required_evidence: ["졸업예정자 명단", "졸업증명서"] }),
  indicator(17, "취·창업률", "취업", "%", "rate", [60, 60, 70, 70, 70], [null, null, null, null, null], { baseline_value: 60, formula: "취업·창업자 / 취업대상자 * 100", required_evidence: ["4대보험 가입내역 확인서", "창업자 명단", "사업자등록증"] }),
  indicator(18, "연계취업률", "취업", "%", "rate", [40, 40, 50, 50, 50], [null, null, null, null, null], { baseline_value: 40, formula: "지원분야 기업 취업자 / 취업인원 * 100" }),
  indicator(19, "참여기업 취업", "취업", "명", "annual", [2, 5, 8, 8, 8], [null, null, null, null, null]),
  indicator(20, "참여학생 만족도", "만족도", "%", "rate", [88, 90, 95, 95, 95], [null, null, null, null, null], { baseline_value: 85, required_evidence: ["만족도 조사 결과보고서"] }),
  indicator(21, "참여기업 만족도", "만족도", "%", "rate", [88, 90, 95, 95, 95], [null, null, null, null, null], { baseline_value: 85, required_evidence: ["만족도 조사 결과보고서"] }),
  indicator(22, "비교과 프로그램 운영", "참여기업 협업", "건", "annual", [7, 12, 15, 15, 15], [null, null, null, null, null], { indicator_type: "autonomous" }),
  indicator(23, "교과목 개발 및 운영 참여", "참여기업 협업", "건", "cumulative", [10, 35, 58, 58, 58], [null, 25, 23, 0, 0], { indicator_type: "autonomous" }),
  indicator(24, "현장실습 참여 학생 수", "참여기업 협업", "명", "annual", [15, 35, 40, 40, 40], [null, null, null, null, null], { indicator_type: "autonomous" }),
  indicator(25, "인턴십 참여 학생 수", "참여기업 협업", "명", "annual", [5, 15, 20, 20, 20], [null, null, null, null, null], { indicator_type: "autonomous" }),
  indicator(26, "기업수요 산학 공동 과제", "기업수요 산학 공동 과제", "건", "annual", [5, 12, 15, 17, 20], [null, null, null, null, null], { indicator_type: "autonomous" })
];

export const performanceResultsSeed: PerformanceResult[] = performanceIndicatorsSeed.map((item, index) => {
  const target = item.targets[0];
  const isRate = item.aggregation_type === "rate";
  const actual = target === null ? null : Math.max(0, Math.round(target * (0.58 + (index % 6) * 0.09)));
  const numerator = isRate ? actual : null;
  const denominator = isRate ? 100 : null;
  return {
    id: `pr-${item.id}-2026`,
    indicator_id: item.id,
    business_year: 2026,
    actual_value: isRate && numerator !== null && denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : actual,
    numerator,
    denominator,
    calculation_note: "총괄표 기준 v1 seed data 기반 mock 실적",
    input_status: index % 5 === 0 ? "submitted" : index % 7 === 0 ? "draft" : "approved",
    evidence_status: index % 4 === 0 ? "revision_requested" : index % 3 === 0 ? "reviewing" : index % 2 === 0 ? "none" : "approved",
    reviewer_comment: index % 4 === 0 ? "증빙 보완 필요" : undefined,
    created_by: "admin",
    reviewed_by: index % 7 === 0 ? undefined : "reviewer",
    approved_by: index % 7 === 0 ? undefined : "approver",
    created_at: now,
    updated_at: now
  };
});

export const evidenceFilesSeed: EvidenceFile[] = [
  "인사명령서", "업무분장표", "조직도", "학칙 개정 전후 비교표", "사업 참여의사 확인서", "참여기업 활동내역", "참여연구원 명단", "강의계획서", "이수증 발급자 명단", "디지털 배지 발급자 명단", "졸업예정자 명단", "4대보험 가입내역 확인서", "창업자 명단", "사업자등록증", "만족도 조사 결과보고서"
].map((name, index) => ({
  id: `ef-${String(index + 1).padStart(2, "0")}`,
  file_name: `${name}_mock.pdf`,
  file_path: "local-mock://기관승인저장소/metadata-only",
  file_type: "application/pdf",
  file_size: 1024 * (index + 1),
  evidence_type: name,
  description: `${name} 증빙 메타데이터입니다. 실제 파일은 저장하지 않습니다.`,
  uploaded_by: "admin",
  uploaded_at: now,
  version: 1,
  status: index % 5 === 0 ? "revision_requested" : index % 4 === 0 ? "reviewing" : "approved",
  reviewer_comment: index % 5 === 0 ? "원본 여부 확인 필요" : undefined
}));

export const indicatorEvidenceMapSeed: IndicatorEvidenceMap[] = performanceIndicatorsSeed.slice(0, 20).map((indicator, index) => ({
  id: `iem-${index + 1}`,
  indicator_id: indicator.id,
  result_id: `pr-${indicator.id}-2026`,
  evidence_id: evidenceFilesSeed[index % evidenceFilesSeed.length].id,
  mapping_note: "seed data 자동 매핑",
  created_at: now
}));

export const targetVersionsSeed: TargetVersion[] = [
  {
    id: "tv-001",
    indicator_id: "pi-13",
    version: "총괄표 기준 v1",
    previous_values: [null, null, null, null, null],
    new_values: [12, 26, 32, 32, 32],
    change_reason: "초기 seed data 입력",
    changed_by: "admin",
    changed_at: now,
    approved_by: "superAdmin",
    approved_at: now
  }
];

export const sourceStudentsSeed: SourceStudentData[] = [
  { student_id: "mock-stu-001", name: "가상학생A", department: "AI데이터공학전공", grade: 3, participation_year: 2026, program_level: "intermediate", completion_status: "completed", certificate_issued: true, digital_badge_issued: true, graduation_expected: true, employment_status: "seeking", is_partner_company_employment: false, evidence_ids: ["ef-09"] },
  { student_id: "mock-stu-002", name: "가상학생B", department: "철도공학부", grade: 4, participation_year: 2026, program_level: "advanced", completion_status: "completed", certificate_issued: true, digital_badge_issued: false, graduation_expected: true, employment_status: "employed", is_partner_company_employment: true, evidence_ids: ["ef-12"] }
];

export const sourceCompaniesSeed: SourceCompanyData[] = [
  { company_id: "mock-com-001", company_name: "가상 모빌리티 기업", industry: "자율주행", participation_type: "PBL·현장실습", participation_confirmed: true, active_years: [2026], activity_records: ["PBL 멘토링", "현장실습 제안"], evidence_ids: ["ef-05", "ef-06"] }
];

export const sourceProgramsSeed: SourceProgramData[] = [
  { program_id: "mock-prg-001", program_name: "모빌리티 AI 중급 PBL", program_type: "immersive", level: "intermediate", year: 2026, semester: 2, courses: ["AI 모델링", "PBL 실습"], corporate_participation: true, participants: 36, completers: 31, evidence_ids: ["ef-08", "ef-09"] }
];

export const sourceEmploymentsSeed: SourceEmploymentData[] = [
  { employment_id: "mock-emp-001", student_id: "mock-stu-002", graduation_year: 2026, employment_year: 2026, company_name: "가상 모빌리티 기업", employment_type: "정규직", is_partner_company: true, is_linked_employment: true, excluded_from_employment_target: false, evidence_ids: ["ef-12"] }
];
