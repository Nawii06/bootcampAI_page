import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { CompletionRecord, Program } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AdminCompletion() {
  const { toast } = useToast();
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    setCompletions(storageService.get<CompletionRecord>("completions"));
    setPrograms(storageService.get<Program>("programs"));
  }, []);

  const handleToggle = (id: string, field: keyof CompletionRecord, value: boolean) => {
    const updated = completions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    setCompletions(updated);
    storageService.set("completions", updated);
    toast({ title: "업데이트 됨", description: "이수 정보가 변경되었습니다." });
  };

  const columns: ColumnDef<CompletionRecord>[] = [
    { key: "studentName", header: "학생명", cell: (item) => <span className="font-bold">{item.studentName}</span> },
    { 
      key: "programId", 
      header: "프로그램",
      cell: (item) => {
        const prog = programs.find(p => p.id === item.programId);
        return <span className="text-sm">{prog?.name || item.programId}</span>;
      }
    },
    {
      key: "courseCompleted",
      header: "교과 이수",
      cell: (item) => <Switch checked={item.courseCompleted} onCheckedChange={(c) => handleToggle(item.id, "courseCompleted", c)} />
    },
    {
      key: "finalCompleted",
      header: "최종 수료",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Switch checked={item.finalCompleted} onCheckedChange={(c) => handleToggle(item.id, "finalCompleted", c)} />
          {item.finalCompleted && <Badge className="bg-green-600">수료증 발급 대상</Badge>}
        </div>
      )
    },
    {
      key: "performanceRecognized",
      header: "성과 인정",
      cell: (item) => <Switch checked={item.performanceRecognized} onCheckedChange={(c) => handleToggle(item.id, "performanceRecognized", c)} />
    }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="이수·수료 관리" description="학생별 프로그램 이수 현황 체크 및 최종 수료 처리" />

      <DataTable 
        data={completions} 
        columns={columns} 
        filterKey="studentName"
        filterPlaceholder="학생명 검색..."
        actions={
          <Button variant="outline" onClick={() => alert("수료증 일괄 생성 (Mock)")}>
            수료증 일괄 생성
          </Button>
        }
      />
    </PortalLayout>
  );
}
