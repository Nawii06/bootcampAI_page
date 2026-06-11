import { 
  Program, Application, CompletionRecord, Partner, DemandSurvey, 
  IndustryProject, KpiItem, BudgetItem, BudgetChangeLog, EvidenceItem, 
  EvaluationResponse, Portfolio, Notice 
} from "../types";

export const mockPrograms: Program[] = [
  { id: "p1", name: "자율주행 AI 기초공통과정", year: 2026, semester: 1, level: "basic", track: "autonomous", type: "course", capacity: 40, applicationStart: "2026-02-01", applicationEnd: "2026-02-28", completionCriteria: "출석 80% 이상, 중간/기말평가 패스", responsibleDept: "AI모빌리티공학과", linkedKpiIds: ["kpi-06", "kpi-07"], isActive: true, description: "자율주행의 기초 이론 및 AI 알고리즘 입문" },
  { id: "p2", name: "항공 모빌리티 AI 초급", year: 2026, semester: 1, level: "beginner", track: "aviation", type: "course", capacity: 30, applicationStart: "2026-02-01", applicationEnd: "2026-02-28", completionCriteria: "출석 80% 이상, 과제 제출", responsibleDept: "항공운항학과", linkedKpiIds: ["kpi-06"], isActive: true, description: "드론 및 항공 모빌리티를 위한 AI 초급 과정" },
  { id: "p3", name: "철도 AI 중급 PBL", year: 2026, semester: 2, level: "intermediate", track: "railway", type: "pbl", capacity: 20, applicationStart: "2026-08-01", applicationEnd: "2026-08-30", completionCriteria: "PBL 프로젝트 최종보고서 제출 및 발표", responsibleDept: "철도공학부", linkedKpiIds: ["kpi-05", "kpi-09"], isActive: true, description: "철도 신호제어 및 운영 최적화를 위한 AI 모델링 실습" },
  { id: "p4", name: "모빌리티 인프라 AI 고급", year: 2026, semester: 2, level: "advanced", track: "infra", type: "course", capacity: 25, applicationStart: "2026-08-01", applicationEnd: "2026-08-30", completionCriteria: "논문 혹은 특허 수준의 기말 프로젝트", responsibleDept: "스마트시티공학과", linkedKpiIds: ["kpi-09"], isActive: true, description: "스마트 인프라 설계를 위한 딥러닝 고급 과정" },
  { id: "p5", name: "현장실습 연계 프로그램 (자율주행)", year: 2027, semester: 1, level: "field", track: "autonomous", type: "immersive", capacity: 15, applicationStart: "2027-01-15", applicationEnd: "2027-02-15", completionCriteria: "기업 현장실습 160시간 이상 수료 및 평가결과 '우수' 이상", responsibleDept: "부트캠프사업단", linkedKpiIds: ["kpi-05", "kpi-15"], isActive: true, description: "협력기업 현장에서 자율주행 데이터 라벨링 및 모델 학습 실무 수행" },
  { id: "p6", name: "AI 취업연계 캠프", year: 2027, semester: 1, level: "employment", track: "autonomous", type: "extracurricular", capacity: 50, applicationStart: "2027-01-01", applicationEnd: "2027-01-31", completionCriteria: "이력서/포트폴리오 제출 및 모의면접 참여", responsibleDept: "취업지원센터", linkedKpiIds: ["kpi-11", "kpi-12"], isActive: true, description: "AI 분야 취업을 위한 단기 집중 캠프 (전 트랙 공통)" },
  { id: "p7", name: "자율주행 캡스톤 디자인", year: 2027, semester: 2, level: "advanced", track: "autonomous", type: "pbl", capacity: 20, applicationStart: "2027-08-01", applicationEnd: "2027-08-31", completionCriteria: "시제품 제작 및 전시회 출품", responsibleDept: "AI모빌리티공학과", linkedKpiIds: ["kpi-05", "kpi-16"], isActive: true, description: "기업 수요 기반의 자율주행 산학협력 프로젝트" },
  { id: "p8", name: "항공 모빌리티 비교과 세미나", year: 2026, semester: 1, level: "beginner", track: "aviation", type: "extracurricular", capacity: 100, applicationStart: "2026-03-01", applicationEnd: "2026-03-15", completionCriteria: "세미나 3회 이상 참석 및 후기 작성", responsibleDept: "항공운항학과", linkedKpiIds: [], isActive: true, description: "업계 전문가 초청 릴레이 특강" }
];

export const mockApplications: Application[] = [
  { id: "app-1", programId: "p1", studentId: "s-001", studentName: "김민수", dept: "컴퓨터공학과", year: 2, preferredTrack: "autonomous", reason: "자율주행에 관심이 많습니다.", consentGiven: true, status: "selected", appliedAt: "2026-02-10", updatedAt: "2026-02-15" },
  { id: "app-2", programId: "p1", studentId: "mock-student-001", studentName: "홍길동 (가상)", dept: "컴퓨터공학과", year: 3, preferredTrack: "autonomous", reason: "AI 부트캠프를 통해 실무 역량을 키우고 싶습니다.", consentGiven: true, status: "reviewing", appliedAt: "2026-02-11", updatedAt: "2026-02-12" },
  { id: "app-3", programId: "p2", studentId: "s-003", studentName: "이수진", dept: "항공운항학과", year: 1, preferredTrack: "aviation", reason: "항공 AI 입문 희망", consentGiven: true, status: "submitted", appliedAt: "2026-02-14", updatedAt: "2026-02-14" },
  { id: "app-4", programId: "p3", studentId: "s-004", studentName: "박철도", dept: "철도공학부", year: 3, preferredTrack: "railway", reason: "철도 시스템 최적화 연구", consentGiven: true, status: "supplement", appliedAt: "2026-08-05", updatedAt: "2026-08-10", reviewNote: "성적 증명서 첨부 누락" },
  { id: "app-5", programId: "p4", studentId: "s-005", studentName: "최도시", dept: "스마트시티공학과", year: 4, preferredTrack: "infra", reason: "교통 인프라 딥러닝 프로젝트 진행", consentGiven: true, status: "waitlisted", appliedAt: "2026-08-25", updatedAt: "2026-08-28" },
  { id: "app-6", programId: "p5", studentId: "s-006", studentName: "강현장", dept: "AI모빌리티공학과", year: 4, preferredTrack: "autonomous", reason: "실무 경험 확보", consentGiven: true, status: "rejected", appliedAt: "2027-01-20", updatedAt: "2027-01-22", reviewNote: "선수과목 이수 요건 미충족" },
  { id: "app-7", programId: "p6", studentId: "mock-student-001", studentName: "홍길동 (가상)", dept: "컴퓨터공학과", year: 3, preferredTrack: "autonomous", reason: "취업 준비를 체계적으로 하고 싶습니다.", consentGiven: true, status: "selected", appliedAt: "2027-01-10", updatedAt: "2027-01-15" },
  { id: "app-8", programId: "p7", studentId: "s-008", studentName: "조디자인", dept: "AI모빌리티공학과", year: 3, preferredTrack: "autonomous", reason: "캡스톤 출품작 제작", consentGiven: true, status: "selected", appliedAt: "2027-08-10", updatedAt: "2027-08-12" },
  { id: "app-9", programId: "p8", studentId: "s-009", studentName: "윤세미", dept: "항공서비스학과", year: 1, preferredTrack: "aviation", reason: "트렌드 파악", consentGiven: true, status: "submitted", appliedAt: "2026-03-05", updatedAt: "2026-03-05" },
  { id: "app-10", programId: "p1", studentId: "s-010", studentName: "정기초", dept: "전자공학과", year: 2, preferredTrack: "autonomous", reason: "기초 탄탄", consentGiven: true, status: "reviewing", appliedAt: "2026-02-20", updatedAt: "2026-02-21" }
];

export const mockKpis: KpiItem[] = [
  { id: "kpi-01", name: "부트캠프사업단 전담 인력 수", category: "운영기반", targetValue: 5, actualValue: 4, unit: "명", responsibleDept: "사업단", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-02", name: "제도 개선 건수", category: "운영기반", targetValue: 3, actualValue: 2, unit: "건", responsibleDept: "학사지원팀", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-03", name: "참여기업 수", category: "산학협력", targetValue: 20, actualValue: 12, unit: "개", responsibleDept: "산학협력단", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-04", name: "참여교원 수", category: "교육기반", targetValue: 15, actualValue: 11, unit: "명", responsibleDept: "교무처", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-05", name: "몰입형 교육프로그램 운영 건수", category: "프로그램", targetValue: 4, actualValue: 3, unit: "건", responsibleDept: "사업단", linkedProgramIds: ["p3", "p5", "p7"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-06", name: "교과형 교육프로그램 운영 건수", category: "프로그램", targetValue: 8, actualValue: 6, unit: "건", responsibleDept: "사업단", linkedProgramIds: ["p1", "p2", "p4"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-07", name: "교과목 개발 건수", category: "교육기반", targetValue: 10, actualValue: 7, unit: "건", responsibleDept: "사업단", linkedProgramIds: ["p1"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-08", name: "양성인원", category: "인재양성", targetValue: 150, actualValue: 98, unit: "명", responsibleDept: "사업단", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-09", name: "중·고급 이수자", category: "인재양성", targetValue: 50, actualValue: 28, unit: "명", responsibleDept: "사업단", linkedProgramIds: ["p3", "p4", "p7"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-10", name: "배출인원", category: "인재양성", targetValue: 120, actualValue: 75, unit: "명", responsibleDept: "사업단", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-11", name: "취·창업률", category: "성과", targetValue: 70, actualValue: 52, unit: "%", responsibleDept: "취업지원센터", linkedProgramIds: ["p6"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-12", name: "연계취업률", category: "성과", targetValue: 30, actualValue: 18, unit: "%", responsibleDept: "취업지원센터", linkedProgramIds: ["p6"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-13", name: "참여학생 만족도", category: "만족도", targetValue: 90, actualValue: 85, unit: "%", responsibleDept: "사업단", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-14", name: "참여기업 만족도", category: "만족도", targetValue: 85, actualValue: 80, unit: "%", responsibleDept: "산학협력단", linkedProgramIds: [], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-15", name: "현장실습 참여 학생 수", category: "산학협력", targetValue: 30, actualValue: 22, unit: "명", responsibleDept: "산학협력단", linkedProgramIds: ["p5"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 },
  { id: "kpi-16", name: "기업수요 산학공동과제 수", category: "산학협력", targetValue: 5, actualValue: 3, unit: "건", responsibleDept: "산학협력단", linkedProgramIds: ["p7"], linkedBudgetIds: [], linkedEvidenceIds: [], year: 2026 }
];

export const mockBudgetItems: BudgetItem[] = [
  { id: "b-01", category: "인건비", subItem: "사업단장 수당", allocatedAmount: 12000000, executedAmount: 6000000, executionMonth: "2026-06", linkedProgramIds: [], linkedKpiIds: ["kpi-01"], linkedEvidenceIds: [], executionPurpose: "상반기 사업단장 직책수당 지급", reviewStatus: "approved", isPublic: false, notes: "" },
  { id: "b-02", category: "인건비", subItem: "전담직원 인건비", allocatedAmount: 150000000, executedAmount: 70000000, executionMonth: "2026-06", linkedProgramIds: [], linkedKpiIds: ["kpi-01"], linkedEvidenceIds: [], executionPurpose: "전담직원 4명 상반기 급여", reviewStatus: "approved", isPublic: false, notes: "" },
  { id: "b-03", category: "운영비", subItem: "프로그램 운영비(자율주행)", allocatedAmount: 30000000, executedAmount: 15000000, executionMonth: "2026-03", linkedProgramIds: ["p1"], linkedKpiIds: ["kpi-06"], linkedEvidenceIds: [], executionPurpose: "자율주행 기초공통과정 실습 재료비 및 특강 강사료", reviewStatus: "approved", isPublic: false, notes: "" },
  { id: "b-04", category: "운영비", subItem: "현장실습 지원비", allocatedAmount: 40000000, executedAmount: 0, executionMonth: "2027-01", linkedProgramIds: ["p5"], linkedKpiIds: ["kpi-15"], linkedEvidenceIds: [], executionPurpose: "협력기업 현장실습 참여 학생 체재비 지원", reviewStatus: "pending", isPublic: false, notes: "집행 대기" },
  { id: "b-05", category: "학생장학금", subItem: "우수 이수자 장학금", allocatedAmount: 50000000, executedAmount: 0, executionMonth: "2026-12", linkedProgramIds: [], linkedKpiIds: ["kpi-08"], linkedEvidenceIds: [], executionPurpose: "부트캠프 성과 우수자 장학금 지급", reviewStatus: "pending", isPublic: false, notes: "연말 평가 후 지급 예정" },
  { id: "b-06", category: "기자재구입비", subItem: "AI 실습용 서버 구축", allocatedAmount: 200000000, executedAmount: 195000000, executionMonth: "2026-04", linkedProgramIds: ["p3", "p4", "p7"], linkedKpiIds: [], linkedEvidenceIds: [], executionPurpose: "GPU 서버 2대 구매", reviewStatus: "approved", isPublic: false, notes: "" },
  { id: "b-07", category: "운영비", subItem: "성과발표회 개최비", allocatedAmount: 15000000, executedAmount: 0, executionMonth: "2026-11", linkedProgramIds: [], linkedKpiIds: ["kpi-13", "kpi-14"], linkedEvidenceIds: [], executionPurpose: "연말 산학협력 성과발표회 대관 및 행사 운영", reviewStatus: "pending", isPublic: false, notes: "" },
  { id: "b-08", category: "교재·교구비", subItem: "드론 실습 키트", allocatedAmount: 10000000, executedAmount: 9500000, executionMonth: "2026-02", linkedProgramIds: ["p2"], linkedKpiIds: ["kpi-06"], linkedEvidenceIds: [], executionPurpose: "항공 모빌리티 초급 과정용 실습용 드론 구매", reviewStatus: "approved", isPublic: false, notes: "" },
  { id: "b-09", category: "연구활동비", subItem: "교과목 개발 회의비", allocatedAmount: 5000000, executedAmount: 2100000, executionMonth: "2026-05", linkedProgramIds: [], linkedKpiIds: ["kpi-07"], linkedEvidenceIds: [], executionPurpose: "신규 교과목 개발 위원회 운영비", reviewStatus: "approved", isPublic: false, notes: "" },
  { id: "b-10", category: "평가관리비", subItem: "수요조사 용역비", allocatedAmount: 20000000, executedAmount: 20000000, executionMonth: "2026-01", linkedProgramIds: [], linkedKpiIds: ["kpi-02"], linkedEvidenceIds: [], executionPurpose: "산업체 수요조사 및 커리큘럼 방향 도출 외부 용역", reviewStatus: "approved", isPublic: false, notes: "" }
];

export const mockPartners: Partner[] = [
  { id: "pt-1", name: "테크모빌(주)", type: "company", cooperationType: ["curriculum", "field-practice", "employment"], tracks: ["autonomous"], contactVisible: false, description: "자율주행 SW 개발 및 테스트 솔루션 기업", isActive: true },
  { id: "pt-2", name: "한국항공우주(주)", type: "company", cooperationType: ["pbl", "internship"], tracks: ["aviation"], contactVisible: false, description: "국내 대표 항공우주 체계종합 기업", isActive: true },
  { id: "pt-3", name: "철도기술연구원", type: "institution", cooperationType: ["curriculum", "co-operation"], tracks: ["railway"], contactVisible: false, description: "국가 철도기술 연구 및 표준화 기관", isActive: true },
  { id: "pt-4", name: "스마트인프라솔루션(주)", type: "company", cooperationType: ["field-practice", "employment"], tracks: ["infra"], contactVisible: false, description: "지능형 교통 체계(ITS) 구축 전문 기업", isActive: true },
  { id: "pt-5", name: "에이아이오토(주)", type: "company", cooperationType: ["pbl", "internship"], tracks: ["autonomous"], contactVisible: false, description: "차량용 인포테인먼트 AI 솔루션", isActive: true },
  { id: "pt-6", name: "드론매퍼스(주)", type: "company", cooperationType: ["curriculum", "pbl"], tracks: ["aviation", "infra"], contactVisible: false, description: "드론 기반 공간정보 3D 매핑", isActive: true },
  { id: "pt-7", name: "레일넷(주)", type: "company", cooperationType: ["employment"], tracks: ["railway"], contactVisible: false, description: "철도 통신망 유지보수", isActive: true },
  { id: "pt-8", name: "한국교통안전공단", type: "institution", cooperationType: ["co-operation"], tracks: ["autonomous", "infra"], contactVisible: false, description: "국가 교통안전 및 모빌리티 정책 지원", isActive: true }
];

export const mockNotices: Notice[] = [
  { id: "n-1", title: "2026학년도 첨단산업 인재양성 부트캠프 신청 안내", content: "모빌리티 AI 부트캠프 참가자를 모집합니다.", category: "공지사항", createdAt: "2026-01-15", isPublic: true },
  { id: "n-2", title: "산학협력 기업수요조사 참여 협조 요청", content: "관내 기업체 대상 수요조사를 실시하오니 많은 참여 바랍니다.", category: "기관안내", createdAt: "2026-01-20", isPublic: true },
  { id: "n-3", title: "[필독] 자율주행 캡스톤 디자인 오리엔테이션 일정", content: "8월 20일 대강당에서 진행됩니다.", category: "학사안내", createdAt: "2027-08-05", isPublic: false }
];

export const mockData = {
  programs: mockPrograms,
  applications: mockApplications,
  kpis: mockKpis,
  budgetItems: mockBudgetItems,
  budgetLogs: [] as BudgetChangeLog[],
  partners: mockPartners,
  evidences: [] as EvidenceItem[],
  evaluations: [] as EvaluationResponse[],
  notices: mockNotices,
  completions: [] as CompletionRecord[],
  portfolios: [] as Portfolio[],
  surveys: [] as DemandSurvey[],
  projects: [] as IndustryProject[]
};
