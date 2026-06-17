import { DataTable, type ColumnDef } from "@/components/DataTable";
import { ProgressBar } from "@/components/ProgressBar";
import type { PerformanceIndicator, PerformanceResult } from "../types";
import { calculateAchievementRate, getTarget } from "../performanceService";
import { AchievementRateBadge } from "./AchievementRateBadge";
import { EvidenceStatusBadge } from "./EvidenceStatusBadge";

interface IndicatorTableProps {
  indicators: PerformanceIndicator[];
  results: PerformanceResult[];
  year: number;
  onSelect?: (indicator: PerformanceIndicator) => void;
}

export function IndicatorTable({ indicators, results, year, onSelect }: IndicatorTableProps) {
  const rows = indicators.map((indicator) => {
    const result = results.find((item) => item.indicator_id === indicator.id);
    const calc = result ? calculateAchievementRate(indicator, result) : null;
    return { ...indicator, result, calc };
  });

  const columns: ColumnDef<(typeof rows)[number]>[] = [
    { key: "indicator_code", header: "코드" },
    { key: "indicator_type", header: "구분", cell: (row) => row.indicator_type === "common" ? "공통" : "자율" },
    { key: "category", header: "영역" },
    { key: "indicator_name", header: "지표명", cell: (row) => <span className="font-semibold">{row.indicator_name}</span> },
    { key: "aggregation_type", header: "집계", cell: (row) => row.aggregation_type === "cumulative" ? "누적" : row.aggregation_type === "annual" ? "비누적" : "비율" },
    { key: "target", header: "목표", cell: (row) => `${getTarget(row, year) ?? "-"}${row.unit}` },
    { key: "actual", header: "실적", cell: (row) => `${row.calc?.actualValue ?? "-"}${row.calc?.actualValue !== null && row.calc?.actualValue !== undefined ? row.unit : ""}` },
    { key: "rate", header: "달성률", cell: (row) => <div className="min-w-28"><ProgressBar value={row.calc?.achievementRate ?? 0} colorScheme="auto" /></div> },
    { key: "badge", header: "상태", cell: (row) => <AchievementRateBadge value={row.calc?.achievementRate} /> },
    { key: "evidence", header: "증빙", cell: (row) => <EvidenceStatusBadge status={row.result?.evidence_status ?? "none"} /> }
  ];

  return <DataTable data={rows} columns={columns} filterKey="indicator_name" filterPlaceholder="지표명 검색" onRowClick={onSelect} />;
}
