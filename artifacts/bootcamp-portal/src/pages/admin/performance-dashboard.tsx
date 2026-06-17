import { useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { YearSelector } from "@/performance/components/YearSelector";
import { PerformanceDashboard } from "@/performance/components/PerformanceDashboard";
import { IndicatorTable } from "@/performance/components/IndicatorTable";
import { getIndicators, getPerformanceResults } from "@/performance/performanceService";

export default function AdminPerformanceDashboard() {
  const [year, setYear] = useState(2026);
  const indicators = getIndicators();
  const results = getPerformanceResults(year);

  return (
    <PortalLayout>
      <SectionHeader title="성과관리 대시보드" description="연차평가·단계평가·종합평가 대응을 위한 성과 현황 요약">
        <YearSelector value={year} onChange={setYear} />
      </SectionHeader>
      <PerformanceDashboard indicators={indicators} results={results} />
      <div className="mt-6">
        <IndicatorTable indicators={indicators} results={results} year={year} />
      </div>
    </PortalLayout>
  );
}
