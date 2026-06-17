import { useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { EvidenceStatusBadge } from "@/performance/components/EvidenceStatusBadge";
import { EvidenceUploadPanel } from "@/performance/components/EvidenceUploadPanel";
import type { EvidenceFile } from "@/performance/types";
import { getEvidenceFiles, getIndicators, updateEvidenceStatus } from "@/performance/performanceService";

export default function AdminPerformanceEvidence() {
  const [refresh, setRefresh] = useState(0);
  const indicators = getIndicators();
  const evidences = getEvidenceFiles();
  const columns: ColumnDef<EvidenceFile>[] = [
    { key: "evidence_type", header: "증빙 유형" },
    { key: "file_name", header: "파일명" },
    { key: "version", header: "버전" },
    { key: "uploaded_by", header: "업로드자" },
    { key: "uploaded_at", header: "업로드일" },
    { key: "status", header: "상태", cell: (row) => <EvidenceStatusBadge status={row.status} /> },
    { key: "action", header: "상태 변경", cell: (row) => (
      <select className="h-8 rounded-md border bg-background px-2" value={row.status} onChange={(event) => {
        updateEvidenceStatus(row.id, event.target.value as EvidenceFile["status"]);
        setRefresh((value) => value + 1);
      }}>
        {["uploaded", "reviewing", "revision_requested", "approved"].map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
    ) }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="증빙자료 관리" description="증빙자료 metadata 등록, 지표 매핑, 상태 및 버전관리를 수행합니다." />
      <EvidenceUploadPanel indicators={indicators} onSaved={() => setRefresh((value) => value + 1)} />
      <div className="mt-6">
        <DataTable key={refresh} data={evidences} columns={columns} />
      </div>
    </PortalLayout>
  );
}
