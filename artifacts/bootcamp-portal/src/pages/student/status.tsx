import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { storageService } from "../../services/storageService";
import { Application, Program } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

export default function StudentStatus() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (!user) return;
    setPrograms(storageService.get<Program>("programs"));
    setApps(storageService.get<Application>("applications").filter(a => a.studentId === user.id));
  }, [user]);

  const columns: ColumnDef<Application>[] = [
    {
      key: "programId",
      header: "프로그램명",
      cell: (item) => {
        const prog = programs.find(p => p.id === item.programId);
        return <span className="font-medium">{prog?.name || item.programId}</span>;
      }
    },
    { key: "preferredTrack", header: "희망 트랙", cell: (item) => item.preferredTrack },
    { key: "appliedAt", header: "신청일" },
    { 
      key: "status", 
      header: "상태",
      cell: (item) => <StatusBadge status={item.status} />
    },
    { 
      key: "reviewNote", 
      header: "비고(보완요청 등)",
      cell: (item) => <span className="text-destructive text-sm">{item.reviewNote || "-"}</span>
    }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="신청현황" description="나의 프로그램 신청 내역 및 심사 상태" />
      <DataTable 
        data={apps} 
        columns={columns} 
      />
    </PortalLayout>
  );
}
