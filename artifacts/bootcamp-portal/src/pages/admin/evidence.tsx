import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { EvidenceItem } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminEvidence() {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);

  useEffect(() => {
    setEvidences(storageService.get<EvidenceItem>("evidences"));
  }, []);

  const columns: ColumnDef<EvidenceItem>[] = [
    { key: "year", header: "연차", cell: (item) => `${item.year}년차` },
    { key: "area", header: "영역" },
    { key: "indicatorName", header: "지표명" },
    { key: "fileName", header: "파일명", cell: (item) => <span className="text-primary hover:underline cursor-pointer">{item.fileName}</span> },
    { 
      key: "containsPersonalInfo", 
      header: "개인정보",
      cell: (item) => item.containsPersonalInfo ? <Badge variant="destructive">포함</Badge> : <Badge variant="outline" className="text-gray-400">없음</Badge>
    },
    { key: "responsibleDept", header: "담당부서" }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="증빙자료 관리" description="사업 실적 및 지표 달성에 대한 증빙 문서 아카이브">
        <Button onClick={() => alert("증빙 추가 팝업 (Mock)")}>+ 증빙 추가</Button>
      </SectionHeader>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
        <p><strong>안내:</strong> 원본 파일은 기관의 승인된 보안 저장소에 보관되며, 본 포털에서는 메타데이터 이력만 관리합니다. 개인정보가 포함된 증빙(예: 출석부)은 반드시 마스킹 처리 후 업로드 내역을 등록하세요.</p>
      </div>

      {evidences.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg bg-card">
          등록된 증빙 자료가 없습니다.
        </div>
      ) : (
        <DataTable data={evidences} columns={columns} />
      )}
    </PortalLayout>
  );
}
