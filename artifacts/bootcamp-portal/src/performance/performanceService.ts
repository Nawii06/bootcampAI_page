import type {
  CalculationResult,
  EvidenceFile,
  EvidenceStatus,
  IndicatorEvidenceMap,
  PerformanceIndicator,
  PerformanceResult,
  TargetVersion
} from "./types";
import {
  evidenceFilesSeed,
  indicatorEvidenceMapSeed,
  performanceIndicatorsSeed,
  performanceResultsSeed,
  targetVersionsSeed
} from "./seedData";

const keys = {
  indicators: "performance_indicators",
  results: "performance_results",
  evidences: "performance_evidence_files",
  maps: "performance_indicator_evidence_maps",
  versions: "performance_target_versions"
};

function read<T>(key: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw) as T[];
}

function write<T>(key: string, rows: T[]): void {
  localStorage.setItem(key, JSON.stringify(rows));
}

export function getYearIndex(year: number): number {
  return Math.max(0, Math.min(4, year - 2026));
}

export function getTarget(indicator: PerformanceIndicator, year: number): number | null {
  return indicator.targets[getYearIndex(year)] ?? null;
}

export function getIndicators(): PerformanceIndicator[] {
  return read(keys.indicators, performanceIndicatorsSeed);
}

export function getIndicatorById(id: string): PerformanceIndicator | undefined {
  return getIndicators().find((indicator) => indicator.id === id);
}

export function createIndicator(data: PerformanceIndicator): PerformanceIndicator {
  const rows = getIndicators();
  write(keys.indicators, [data, ...rows]);
  return data;
}

export function updateIndicator(id: string, data: Partial<PerformanceIndicator> & { change_reason?: string }): PerformanceIndicator | undefined {
  if (!data.change_reason) {
    throw new Error("목표값 변경 시 변경사유 입력은 필수입니다.");
  }
  const rows = getIndicators();
  const current = rows.find((row) => row.id === id);
  if (!current) return undefined;
  const next = { ...current, ...data, updated_at: new Date().toISOString() };
  const version: TargetVersion = {
    id: `tv-${Date.now()}`,
    indicator_id: id,
    version: `${current.version} 수정`,
    previous_values: current.targets,
    new_values: next.targets,
    change_reason: data.change_reason,
    changed_by: "admin",
    changed_at: new Date().toISOString()
  };
  write(keys.indicators, rows.map((row) => (row.id === id ? next : row)));
  write(keys.versions, [version, ...getTargetVersions()]);
  return next;
}

export function getPerformanceResults(year?: number): PerformanceResult[] {
  const rows = read(keys.results, performanceResultsSeed);
  return year ? rows.filter((row) => row.business_year === year) : rows;
}

export function createPerformanceResult(data: PerformanceResult): PerformanceResult {
  const indicator = getIndicatorById(data.indicator_id);
  const calculated = indicator ? calculateAchievementRate(indicator, data) : { actualValue: data.actual_value, achievementRate: null };
  const next = { ...data, actual_value: calculated.actualValue, achievement_rate: calculated.achievementRate, updated_at: new Date().toISOString() };
  write(keys.results, [next, ...getPerformanceResults()]);
  return next;
}

export function updatePerformanceResult(id: string, data: Partial<PerformanceResult>): PerformanceResult | undefined {
  const rows = getPerformanceResults();
  const current = rows.find((row) => row.id === id);
  if (!current) return undefined;
  const indicator = getIndicatorById(current.indicator_id);
  const candidate = { ...current, ...data, updated_at: new Date().toISOString() };
  const calculated = indicator ? calculateAchievementRate(indicator, candidate) : { actualValue: candidate.actual_value, achievementRate: null };
  const next = { ...candidate, actual_value: calculated.actualValue, achievement_rate: calculated.achievementRate };
  write(keys.results, rows.map((row) => (row.id === id ? next : row)));
  return next;
}

export function calculateAchievementRate(indicator: PerformanceIndicator, result: PerformanceResult): CalculationResult {
  const warnings: string[] = [];
  const target = getTarget(indicator, result.business_year);
  if (target === null || target === 0) {
    return { actualValue: result.actual_value, achievementRate: null, status: "no_target", warnings: ["목표값이 없어 달성률 계산에서 제외됩니다."] };
  }

  let actualValue = result.actual_value;
  if (indicator.aggregation_type === "rate") {
    if (!result.denominator || result.denominator === 0) {
      return { actualValue: null, achievementRate: null, status: "not_calculable", warnings: ["분모가 0이거나 없어 계산불가입니다."] };
    }
    actualValue = Number((((result.numerator ?? 0) / result.denominator) * 100).toFixed(1));
  }

  if (actualValue === null || Number.isNaN(actualValue)) {
    return { actualValue: null, achievementRate: null, status: "not_calculable", warnings: ["실적값이 없어 계산불가입니다."] };
  }

  if (indicator.aggregation_type === "cumulative") {
    const previous = getPerformanceResults(result.business_year - 1).find((row) => row.indicator_id === indicator.id);
    if (previous?.actual_value !== null && previous?.actual_value !== undefined && actualValue < previous.actual_value) {
      warnings.push("누적 지표의 실적값이 전년도보다 감소했습니다.");
    }
  }

  if (indicator.indicator_name.includes("중·고급") && actualValue < 60) {
    warnings.push("중·고급 이수자 비율이 60% 미만입니다.");
  }

  const achievementRate = Number(((actualValue / target) * 100).toFixed(1));
  return {
    actualValue,
    achievementRate,
    status: result.input_status === "approved" ? "ok" : "provisional",
    warnings
  };
}

export function getEvidenceFiles(indicatorId?: string): EvidenceFile[] {
  const evidences = read(keys.evidences, evidenceFilesSeed);
  if (!indicatorId) return evidences;
  const mappedIds = getEvidenceMaps().filter((map) => map.indicator_id === indicatorId).map((map) => map.evidence_id);
  return evidences.filter((evidence) => mappedIds.includes(evidence.id));
}

export function uploadEvidenceFile(data: Omit<EvidenceFile, "id" | "uploaded_at" | "version" | "status">): EvidenceFile {
  const next: EvidenceFile = {
    ...data,
    id: `ef-${Date.now()}`,
    uploaded_at: new Date().toISOString(),
    version: 1,
    status: "uploaded"
  };
  write(keys.evidences, [next, ...getEvidenceFiles()]);
  return next;
}

export function getEvidenceMaps(): IndicatorEvidenceMap[] {
  return read(keys.maps, indicatorEvidenceMapSeed);
}

export function mapEvidenceToIndicator(indicatorId: string, evidenceId: string, resultId?: string): IndicatorEvidenceMap {
  const next: IndicatorEvidenceMap = {
    id: `iem-${Date.now()}`,
    indicator_id: indicatorId,
    result_id: resultId,
    evidence_id: evidenceId,
    mapping_note: "관리자 화면에서 수동 매핑",
    created_at: new Date().toISOString()
  };
  write(keys.maps, [next, ...getEvidenceMaps()]);
  return next;
}

export function updateEvidenceStatus(evidenceId: string, status: EvidenceStatus): EvidenceFile | undefined {
  if (status === "none") return undefined;
  const rows = getEvidenceFiles();
  const nextRows = rows.map((row) => (row.id === evidenceId ? { ...row, status } : row));
  write(keys.evidences, nextRows);
  return nextRows.find((row) => row.id === evidenceId);
}

export function getTargetVersions(indicatorId?: string): TargetVersion[] {
  const rows = read(keys.versions, targetVersionsSeed);
  return indicatorId ? rows.filter((row) => row.indicator_id === indicatorId) : rows;
}

function xmlEscape(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function sheet(name: string, headers: string[], rows: (string | number | null | undefined)[][]): string {
  const rowXml = [headers, ...rows].map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${xmlEscape(cell)}</Data></Cell>`).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rowXml}</Table></Worksheet>`;
}

function downloadExcelXml(fileName: string, worksheets: string[]): void {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${worksheets.join("")}</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportPerformanceExcel(year: number): void {
  const indicators = getIndicators();
  const results = getPerformanceResults(year);
  const evidences = getEvidenceFiles();
  const maps = getEvidenceMaps();
  const resultRows = results.map((result) => {
    const indicator = indicators.find((item) => item.id === result.indicator_id);
    const calc = indicator ? calculateAchievementRate(indicator, result) : null;
    return [
      year,
      indicator?.indicator_name,
      indicator ? getTarget(indicator, year) : null,
      calc?.actualValue,
      calc?.achievementRate,
      result.evidence_status,
      result.input_status,
      result.calculation_note
    ];
  });
  downloadExcelXml(`performance_summary_${year}.xls`, [
    sheet("성과지표_목표총괄", ["지표구분", "영역", "세부영역", "지표명", "단위", "기준값", "집계방식", "1차년도 목표", "2차년도 목표", "3차년도 목표", "4차년도 목표", "5차년도 목표", "산식", "증빙자료"], indicators.map((item) => [item.indicator_type, item.area, item.sub_area, item.indicator_name, item.unit, item.baseline_value, item.aggregation_type, ...item.targets, item.formula, item.required_evidence.join(", ")])),
    sheet("연차별_실적현황", ["사업연도", "지표명", "목표값", "실적값", "달성률", "증빙상태", "승인상태", "비고"], resultRows),
    sheet("증빙자료_목록", ["사업연도", "지표명", "증빙자료명", "파일명", "상태", "업로드일", "검토의견"], maps.map((map) => {
      const indicator = indicators.find((item) => item.id === map.indicator_id);
      const evidence = evidences.find((item) => item.id === map.evidence_id);
      return [year, indicator?.indicator_name, evidence?.evidence_type, evidence?.file_name, evidence?.status, evidence?.uploaded_at, evidence?.reviewer_comment];
    }))
  ]);
}

export function exportEvidenceChecklist(year: number): void {
  const indicators = getIndicators();
  const maps = getEvidenceMaps();
  downloadExcelXml(`evidence_checklist_${year}.xls`, [
    sheet("증빙자료_체크리스트", ["지표명", "필수 증빙", "매핑 건수", "상태"], indicators.map((indicator) => {
      const count = maps.filter((map) => map.indicator_id === indicator.id).length;
      return [indicator.indicator_name, indicator.required_evidence.join(", "), count, count > 0 ? "등록" : "미등록"];
    }))
  ]);
}
