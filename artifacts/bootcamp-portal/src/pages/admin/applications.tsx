import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { exportService } from "../../services/exportService";
import { Application, Program } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../../components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminApplications() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    setApps(storageService.get<Application>("applications"));
    setPrograms(storageService.get<Program>("programs"));
  }, []);

  const handleStatusChange = (id: string, newStatus: string) => {
    const updated = apps.map(app => 
      app.id === id ? { ...app, status: newStatus as any, updatedAt: new Date().toISOString().split('T')[0] } : app
    );
    setApps(updated);
    storageService.set("applications", updated);
    toast({ title: "상태 변경", description: "지원서 상태가 업데이트 되었습니다." });
  };

  const handleExport = () => {
    const cols = [
      { key: "id", label: "신청ID" },
      { key: "studentName", label: "이름" },
      { key: "dept", label: "소속학과" },
      { key: "preferredTrack", label: "희망트랙" },
      { key: "status", label: "상태" },
      { key: "appliedAt", label: "신청일" }
    ] as any;
    exportService.downloadCsv("applications_export", apps, cols);
  };

  const columns: ColumnDef<Application>[] = [
    { key: "studentName", header: "지원자" },
    { key: "dept", header: "소속학과" },
    { 
      key: "programId", 
      header: "신청 프로그램",
      cell: (item) => {
        const prog = programs.find(p => p.id === item.programId);
        return <span className="text-sm">{prog?.name || item.programId}</span>;
      }
    },
    { 
      key: "preferredTrack", 
      header: "희망트랙",
      cell: (item) => <Badge variant="outline">{item.preferredTrack}</Badge>
    },
    { 
      key: "status", 
      header: "현재상태",
      cell: (item) => <StatusBadge status={item.status} />
    },
    { 
      key: "action", 
      header: "상태변경",
      cell: (item) => (
        <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="submitted">접수</SelectItem>
            <SelectItem value="reviewing">검토중</SelectItem>
            <SelectItem value="supplement">보완요청</SelectItem>
            <SelectItem value="selected">선발</SelectItem>
            <SelectItem value="rejected">미선발</SelectItem>
            <SelectItem value="waitlisted">대기</SelectItem>
          </SelectContent>
        </Select>
      )
    }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="신청·선발 관리" description="부트캠프 신청자 내역 확인 및 선발 처리">
        <Button onClick={handleExport} variant="outline" size="sm">CSV 다운로드</Button>
      </SectionHeader>

      <DataTable 
        data={apps} 
        columns={columns} 
        filterKey="studentName"
        filterPlaceholder="지원자 이름 검색..."
      />
    </PortalLayout>
  );
}
