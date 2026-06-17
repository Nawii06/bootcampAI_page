import type { PerformanceIndicator } from "../types";
import { getEvidenceFiles } from "../performanceService";

export function MissingEvidenceList({ indicators }: { indicators: PerformanceIndicator[] }) {
  const rows = indicators.filter((indicator) => getEvidenceFiles(indicator.id).length === 0);
  return (
    <div className="rounded-md border bg-card p-4">
      <h3 className="font-semibold mb-3">증빙 미등록 지표</h3>
      <ul className="space-y-2 text-sm">
        {rows.length === 0 ? <li className="text-muted-foreground">모든 지표에 증빙이 매핑되어 있습니다.</li> : rows.map((row) => <li key={row.id}>{row.indicator_code} · {row.indicator_name}</li>)}
      </ul>
    </div>
  );
}
