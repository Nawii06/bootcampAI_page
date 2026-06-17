import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PerformanceIndicator } from "../types";
import { mapEvidenceToIndicator, uploadEvidenceFile } from "../performanceService";

export function EvidenceUploadPanel({ indicators, onSaved }: { indicators: PerformanceIndicator[]; onSaved: () => void }) {
  const [indicatorId, setIndicatorId] = useState(indicators[0]?.id ?? "");
  const [fileName, setFileName] = useState("mock-evidence.pdf");
  const [evidenceType, setEvidenceType] = useState("성과 산출근거");
  const [description, setDescription] = useState("실제 파일 업로드 전 metadata 기반 mock 증빙입니다.");

  function save() {
    const evidence = uploadEvidenceFile({
      file_name: fileName,
      file_path: "local-mock://metadata-only",
      file_type: "application/pdf",
      file_size: 0,
      evidence_type: evidenceType,
      description,
      uploaded_by: "admin"
    });
    mapEvidenceToIndicator(indicatorId, evidence.id);
    onSaved();
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <p className="text-sm text-muted-foreground">현재 단계에서는 실제 파일을 저장하지 않고 증빙 metadata와 지표 매핑만 관리합니다.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm font-medium">매핑 지표
          <select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}>
            {indicators.map((item) => <option key={item.id} value={item.id}>{item.indicator_name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">파일명<Input className="mt-1" value={fileName} onChange={(event) => setFileName(event.target.value)} /></label>
        <label className="text-sm font-medium">증빙 유형<Input className="mt-1" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} /></label>
        <label className="text-sm font-medium md:col-span-3">설명<Input className="mt-1" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </div>
      <Button onClick={save}>증빙 metadata 등록</Button>
    </div>
  );
}
