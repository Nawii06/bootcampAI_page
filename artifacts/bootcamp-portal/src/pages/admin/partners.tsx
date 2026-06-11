import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { Partner } from "../../types";
import { Badge } from "@/components/ui/badge";

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    setPartners(storageService.get<Partner>("partners"));
  }, []);

  const columns: ColumnDef<Partner>[] = [
    { key: "name", header: "기관명", cell: (item) => <span className="font-bold">{item.name}</span> },
    { key: "type", header: "구분", cell: (item) => item.type === 'company' ? '기업' : '연구기관' },
    { 
      key: "cooperationType", 
      header: "협력 유형",
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.cooperationType.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
        </div>
      )
    },
    { 
      key: "tracks", 
      header: "관련 트랙",
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.tracks.map(t => <span key={t} className="bg-slate-100 text-slate-800 text-xs px-1.5 rounded">{t}</span>)}
        </div>
      )
    },
    { 
      key: "isActive", 
      header: "상태",
      cell: (item) => item.isActive ? <Badge className="bg-green-600">활성</Badge> : <Badge variant="outline">비활성</Badge>
    }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="참여기업 관리" description="산학협력 기업 및 기관 풀 관리" />
      <DataTable 
        data={partners} 
        columns={columns} 
        filterKey="name"
        filterPlaceholder="기관명 검색..."
      />
    </PortalLayout>
  );
}
