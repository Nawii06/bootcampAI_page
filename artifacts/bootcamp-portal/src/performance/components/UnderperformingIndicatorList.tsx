import type { PerformanceIndicator, PerformanceResult } from "../types";
import { calculateAchievementRate } from "../performanceService";

export function UnderperformingIndicatorList({ indicators, results }: { indicators: PerformanceIndicator[]; results: PerformanceResult[] }) {
  const rows = results.map((result) => {
    const indicator = indicators.find((item) => item.id === result.indicator_id);
    return indicator ? { indicator, calc: calculateAchievementRate(indicator, result) } : null;
  }).filter((row) => row && row.calc.achievementRate !== null && row.calc.achievementRate < 70);

  return (
    <div className="rounded-md border bg-card p-4">
      <h3 className="font-semibold mb-3">미달성 지표</h3>
      <ul className="space-y-2 text-sm">
        {rows.length === 0 ? <li className="text-muted-foreground">미달성 지표가 없습니다.</li> : rows.map((row) => <li key={row!.indicator.id}>{row!.indicator.indicator_name} · {row!.calc.achievementRate}%</li>)}
      </ul>
    </div>
  );
}
