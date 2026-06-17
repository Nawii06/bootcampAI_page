import { Button } from "@/components/ui/button";
import { exportEvidenceChecklist, exportPerformanceExcel } from "../performanceService";

export function ExportPanel({ year }: { year: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="rounded-md border bg-card p-4">
        <h3 className="font-semibold">연차별 성과현황</h3>
        <p className="text-sm text-muted-foreground my-2">목표총괄, 실적현황, 증빙목록 다중 시트 Excel 파일</p>
        <Button onClick={() => exportPerformanceExcel(year)}>performance_summary_{year}.xls</Button>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h3 className="font-semibold">증빙자료 체크리스트</h3>
        <p className="text-sm text-muted-foreground my-2">지표별 필수 증빙과 매핑 상태</p>
        <Button variant="outline" onClick={() => exportEvidenceChecklist(year)}>evidence_checklist_{year}.xls</Button>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h3 className="font-semibold">K-PASS 입력용</h3>
        <p className="text-sm text-muted-foreground my-2">현재는 성과현황 파일의 연차별 실적현황 시트를 활용합니다.</p>
        <Button variant="secondary" onClick={() => exportPerformanceExcel(year)}>kpass_input_{year}.xls</Button>
      </div>
    </div>
  );
}
