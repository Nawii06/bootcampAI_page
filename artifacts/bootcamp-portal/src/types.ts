export type Role = "public" | "student" | "partner" | "admin" | "superAdmin";
export type Track = "autonomous" | "aviation" | "railway" | "infra";
export type ProgramLevel = "basic" | "beginner" | "intermediate" | "advanced" | "field" | "employment";
export type ProgramType = "course" | "extracurricular" | "immersive" | "pbl";
export type ApplicationStatus = "submitted" | "reviewing" | "supplement" | "selected" | "rejected" | "waitlisted";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  accountId?: string;
  name: string;
  role: Role;
  roles?: string[];
  dept?: string;
  year?: number;
  company?: string;
}

export interface Program {
  id: string;
  name: string;
  year: number;
  semester: number;
  level: ProgramLevel;
  track: Track;
  type: ProgramType;
  capacity: number;
  applicationStart: string;
  applicationEnd: string;
  completionCriteria: string;
  responsibleDept: string;
  linkedKpiIds: string[];
  isActive: boolean;
  description: string;
}

export interface Application {
  id: string;
  programId: string;
  studentId: string;
  studentName: string;
  dept: string;
  year: number;
  preferredTrack: Track;
  reason: string;
  consentGiven: boolean;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  reviewNote?: string;
}

export interface CompletionRecord {
  id: string;
  studentId: string;
  studentName: string;
  programId: string;
  courseCompleted: boolean;
  extracurricularCompleted: boolean;
  pblParticipated: boolean;
  fieldPracticeParticipated: boolean;
  internshipParticipated: boolean;
  finalCompleted: boolean;
  performanceRecognized: boolean;
  portfolioId?: string;
}

export interface Partner {
  id: string;
  name: string;
  type: "company" | "institution";
  cooperationType: ("curriculum" | "co-operation" | "pbl" | "field-practice" | "internship" | "employment")[];
  tracks: Track[];
  contactVisible: boolean;
  description: string;
  isActive: boolean;
}

export interface DemandSurvey {
  id: string;
  partnerId: string;
  partnerName: string;
  requiredSkills: string[];
  requiredCourses: string[];
  projectTopics: string[];
  canFieldPractice: boolean;
  canInternship: boolean;
  canEmploy: boolean;
  requiredHeadcount: number;
  submittedAt: string;
}

export interface IndustryProject {
  id: string;
  partnerId: string;
  title: string;
  track: Track;
  problemDefinition: string;
  dataTypes: string[];
  expectedOutputs: string[];
  mentorRole: string;
  evaluationCriteria: string;
  status: "proposed" | "approved" | "ongoing" | "completed";
}

export interface KpiItem {
  id: string;
  name: string;
  category: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  responsibleDept: string;
  linkedProgramIds: string[];
  linkedBudgetIds: string[];
  linkedEvidenceIds: string[];
  improvementPlan?: string;
  year: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  subItem: string;
  allocatedAmount: number;
  executedAmount: number;
  executionMonth: string;
  linkedProgramIds: string[];
  linkedKpiIds: string[];
  linkedEvidenceIds: string[];
  executionPurpose: string;
  reviewStatus: ReviewStatus;
  isPublic: boolean;
  notes: string;
}

export interface BudgetChangeLog {
  id: string;
  budgetItemId: string;
  changedAt: string;
  changedField: string;
  previousAmount: number;
  newAmount: number;
  changeAmount: number;
  reason: string;
  approver: string;
  relatedDoc: string;
  linkedKpiIds: string[];
}

export interface EvidenceItem {
  id: string;
  year: number;
  area: string;
  indicatorName: string;
  achievementName: string;
  fileName: string;
  storageLocation: string;
  isOriginal: boolean;
  containsPersonalInfo: boolean;
  isMasked: boolean;
  responsibleDept: string;
  isExternalSubmission: boolean;
  linkedKpiIds: string[];
  linkedBudgetIds: string[];
}

export interface EvaluationResponse {
  id: string;
  question: string;
  answerSummary: string;
  linkedKpiIds: string[];
  linkedAchievements: string[];
  linkedEvidenceIds: string[];
  limitations: string;
  improvementPlan: string;
}

export interface Portfolio {
  id: string;
  studentId: string;
  projectSummary: string;
  techStack: string[];
  outputLinks: string[];
  companyEvaluation: string;
  isPublicConsented: boolean;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  isPublic: boolean;
}
