import { StatCard } from "@/components/StatCard";
import type { PerformanceIndicator, PerformanceResult } from "../types";
import { calculateAchievementRate } from "../performanceService";

interface IndicatorSummaryCardsProps {
  indicators: PerformanceIndicator[];
  results: PerformanceResult[];
}

export function IndicatorSummaryCards({ indicators, results }: IndicatorSummaryCardsProps) {
  const calculations = results.map((result) => {
    const indicator = indicators.find((item) => item.id === result.indicator_id);
    return indicator ? calculateAchievementRate(indicator, result) : null;
  }).filter(Boolean);
  const achieved = calculations.filter((calc) => (calc?.achievementRate ?? 0) >= 100).length;
  const under = calculations.filter((calc) => calc?.achievementRate !== null && (calc?.achievementRate ?? 0) < 70).length;
  const approvedEvidence = results.filter((result) => result.evidence_status === "approved").length;
  const reviewingEvidence = results.filter((result) => result.evidence_status === "reviewing").length;
  const revision = results.filter((result) => result.evidence_status === "revision_requested").length;
  const average = calculations.length ? Math.round(calculations.reduce((sum, calc) => sum + (calc?.achievementRate ?? 0), 0) / calculations.length) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      <StatCard label="총 지표 수" value={indicators.length} />
      <StatCard label="전체 달성률" value={`${average}%`} />
      <StatCard label="목표 달성" value={`${achieved}건`} />
      <StatCard label="미달성" value={`${under}건`} />
      <StatCard label="증빙 승인" value={`${approvedEvidence}건`} />
      <StatCard label="보완요청" value={`${revision}건`} sublabel={`검토중 ${reviewingEvidence}건`} />
    </div>
  );
}
