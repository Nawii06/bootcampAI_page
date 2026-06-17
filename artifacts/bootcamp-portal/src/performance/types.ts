export type IndicatorType = "common" | "autonomous";
export type AggregationType = "cumulative" | "annual" | "rate";
export type ResultStatus = "draft" | "submitted" | "reviewed" | "approved" | "rejected";
export type EvidenceStatus = "none" | "uploaded" | "reviewing" | "revision_requested" | "approved";

export interface PerformanceIndicator {
  id: string;
  indicator_code: string;
  indicator_type: IndicatorType;
  category: string;
  area: string;
  sub_area?: string;
  indicator_name: string;
  unit: string;
  baseline_value?: string | number | null;
  aggregation_type: AggregationType;
  targets: [number | null, number | null, number | null, number | null, number | null];
  target_increments: [number | null, number | null, number | null, number | null, number | null];
  definition: string;
  formula: string;
  measurement_method: string;
  required_evidence: string[];
  source: string;
  source_page?: string;
  version: string;
  is_active: boolean;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceResult {
  id: string;
  indicator_id: string;
  business_year: number;
  actual_value: number | null;
  numerator?: number | null;
  denominator?: number | null;
  calculated_rate?: number | null;
  achievement_rate?: number | null;
  calculation_note: string;
  input_status: ResultStatus;
  evidence_status: EvidenceStatus;
  reviewer_comment?: string;
  created_by: string;
  reviewed_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  evidence_type: string;
  description: string;
  uploaded_by: string;
  uploaded_at: string;
  version: number;
  status: Exclude<EvidenceStatus, "none">;
  reviewer_comment?: string;
}

export interface IndicatorEvidenceMap {
  id: string;
  indicator_id: string;
  result_id?: string;
  evidence_id: string;
  mapping_note: string;
  created_at: string;
}

export interface TargetVersion {
  id: string;
  indicator_id: string;
  version: string;
  previous_values: [number | null, number | null, number | null, number | null, number | null];
  new_values: [number | null, number | null, number | null, number | null, number | null];
  change_reason: string;
  changed_by: string;
  changed_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface SourceStudentData {
  student_id: string;
  name: string;
  department: string;
  grade: number;
  participation_year: number;
  program_level: string;
  completion_status: string;
  certificate_issued: boolean;
  digital_badge_issued: boolean;
  graduation_expected: boolean;
  employment_status: string;
  is_partner_company_employment: boolean;
  evidence_ids: string[];
}

export interface SourceCompanyData {
  company_id: string;
  company_name: string;
  industry: string;
  participation_type: string;
  participation_confirmed: boolean;
  active_years: number[];
  activity_records: string[];
  evidence_ids: string[];
}

export interface SourceProgramData {
  program_id: string;
  program_name: string;
  program_type: "immersive" | "course_based" | "extracurricular";
  level: "basic" | "beginner" | "intermediate" | "advanced";
  year: number;
  semester: number;
  courses: string[];
  corporate_participation: boolean;
  participants: number;
  completers: number;
  evidence_ids: string[];
}

export interface SourceEmploymentData {
  employment_id: string;
  student_id: string;
  graduation_year: number;
  employment_year: number;
  company_name: string;
  employment_type: string;
  is_partner_company: boolean;
  is_linked_employment: boolean;
  excluded_from_employment_target: boolean;
  exclusion_reason?: string;
  evidence_ids: string[];
}

export interface CalculationResult {
  actualValue: number | null;
  achievementRate: number | null;
  status: "ok" | "no_target" | "not_calculable" | "provisional";
  warnings: string[];
}
