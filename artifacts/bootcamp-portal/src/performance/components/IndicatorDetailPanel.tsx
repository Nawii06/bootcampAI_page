import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceIndicator } from "../types";

export function IndicatorDetailPanel({ indicator }: { indicator?: PerformanceIndicator }) {
  if (!indicator) {
    return (
      <Card>
        <CardHeader><CardTitle>지표 상세</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">목록에서 지표를 선택하면 정의, 산식, 측정방법, 필수 증빙자료가 표시됩니다.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{indicator.indicator_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p><strong>정의:</strong> {indicator.definition}</p>
        <p><strong>산식:</strong> {indicator.formula}</p>
        <p><strong>측정방법:</strong> {indicator.measurement_method}</p>
        <p><strong>필수 증빙:</strong> {indicator.required_evidence.join(", ")}</p>
        <p><strong>버전:</strong> {indicator.version}</p>
        {indicator.remarks && <p className="text-destructive"><strong>비고:</strong> {indicator.remarks}</p>}
      </CardContent>
    </Card>
  );
}
