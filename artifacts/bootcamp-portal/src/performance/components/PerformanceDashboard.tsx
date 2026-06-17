import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import type { PerformanceIndicator, PerformanceResult } from "../types";
import { calculateAchievementRate } from "../performanceService";
import { IndicatorSummaryCards } from "./IndicatorSummaryCards";
import { MissingEvidenceList } from "./MissingEvidenceList";
import { UnderperformingIndicatorList } from "./UnderperformingIndicatorList";

export function PerformanceDashboard({ indicators, results }: { indicators: PerformanceIndicator[]; results: PerformanceResult[] }) {
  const common = indicators.filter((item) => item.indicator_type === "common");
  const autonomous = indicators.filter((item) => item.indicator_type === "autonomous");
  const avg = (items: PerformanceIndicator[]) => {
    const rates = items.map((indicator) => {
      const result = results.find((row) => row.indicator_id === indicator.id);
      return result ? calculateAchievementRate(indicator, result).achievementRate : null;
    }).filter((value): value is number => value !== null);
    return rates.length ? rates.reduce((sum, value) => sum + value, 0) / rates.length : 0;
  };

  return (
    <div className="space-y-6">
      <IndicatorSummaryCards indicators={indicators} results={results} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>공통지표 달성률</CardTitle></CardHeader>
          <CardContent><ProgressBar value={avg(common)} colorScheme="auto" label="공통지표 평균" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>자율지표 달성률</CardTitle></CardHeader>
          <CardContent><ProgressBar value={avg(autonomous)} colorScheme="auto" label="자율지표 평균" /></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UnderperformingIndicatorList indicators={indicators} results={results} />
        <MissingEvidenceList indicators={indicators} />
      </div>
    </div>
  );
}
