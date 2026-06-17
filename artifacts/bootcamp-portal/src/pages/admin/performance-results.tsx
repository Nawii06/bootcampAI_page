import { useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { YearSelector } from "@/performance/components/YearSelector";
import { PerformanceResultForm } from "@/performance/components/PerformanceResultForm";
import { AchievementRateBadge } from "@/performance/components/AchievementRateBadge";
import type { PerformanceResult } from "@/performance/types";
import { calculateAchievementRate, getIndicatorById, getIndicators, getPerformanceResults } from "@/performance/performanceService";

export default function AdminPerformanceResults() {
  const [year, setYear] = useState(2026);
  const [refresh, setRefresh] = useState(0);
  const indicators = getIndicators();
  const results = getPerformanceResults(year);
  const columns: ColumnDef<PerformanceResult>[] = [
    { key: "indicator_id", header: "지표명", cell: (row) => getIndicatorById(row.indicator_id)?.indicator_name ?? row.indicator_id },
    { key: "actual_value", header: "실적값" },
    { key: "achievement_rate", header: "달성률", cell: (row) => {
      const indicator = getIndicatorById(row.indicator_id);
      const calc = indicator ? calculateAchievementRate(indicator, row) : null;
      return <AchievementRateBadge value={calc?.achievementRate} />;
    } },
    { key: "input_status", header: "승인상태" },
    { key: "evidence_status", header: "증빙상태" },
    { key: "calculation_note", header: "산출근거" }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="연차별 실적 입력" description="사업연도별 실적값, 비율지표 분자/분모, 산출근거와 승인상태를 관리합니다.">
        <YearSelector value={year} onChange={setYear} />
      </SectionHeader>
      <PerformanceResultForm indicators={indicators} year={year} onSaved={() => setRefresh((value) => value + 1)} />
      <div className="mt-6">
        <DataTable key={refresh} data={results} columns={columns} />
      </div>
    </PortalLayout>
  );
}
