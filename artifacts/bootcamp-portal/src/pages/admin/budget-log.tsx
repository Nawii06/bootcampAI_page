import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { BudgetChangeLog } from "../../types";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminBudgetLog() {
  const [logs, setLogs] = useState<BudgetChangeLog[]>([]);

  useEffect(() => {
    setLogs(storageService.get<BudgetChangeLog>("budgetLogs"));
  }, []);

  const formatCurrency = (val: number) => val.toLocaleString('ko-KR') + '원';

  const columns: ColumnDef<BudgetChangeLog>[] = [
    { key: "changedAt", header: "변경일자" },
    { key: "changedField", header: "변경항목" },
    { key: "previousAmount", header: "변경 전", cell: (item) => formatCurrency(item.previousAmount) },
    { key: "newAmount", header: "변경 후", cell: (item) => formatCurrency(item.newAmount) },
    { key: "changeAmount", header: "증감액", cell: (item) => <span className={item.changeAmount > 0 ? "text-blue-600" : "text-destructive"}>{item.changeAmount > 0 ? "+" : ""}{formatCurrency(item.changeAmount)}</span> },
    { key: "reason", header: "변경사유" },
    { key: "approver", header: "승인권자" }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="예산 변경이력" description="예산 전용 및 집행 계획 변경 로그 조회" />

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            기록된 예산 변경 이력이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <DataTable data={logs} columns={columns} />
      )}
    </PortalLayout>
  );
}
