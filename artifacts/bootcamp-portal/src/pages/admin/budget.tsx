import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { exportService } from "../../services/exportService";
import { BudgetItem } from "../../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminBudget() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  useEffect(() => {
    setBudgetItems(storageService.get<BudgetItem>("budgetItems"));
  }, []);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('ko-KR') + '원';
  };

  const handleExport = () => {
    const cols = [
      { key: "category", label: "예산구분" },
      { key: "subItem", label: "세부항목" },
      { key: "allocatedAmount", label: "편성액" },
      { key: "executedAmount", label: "집행액" },
      { key: "executionMonth", label: "집행월" },
      { key: "executionPurpose", label: "집행목적" },
      { key: "reviewStatus", label: "상태" }
    ] as any;
    exportService.downloadCsv("budget_export", budgetItems, cols);
  };

  const columns: ColumnDef<BudgetItem>[] = [
    { key: "category", header: "구분", cell: (item) => <Badge variant="outline">{item.category}</Badge> },
    { key: "subItem", header: "세부항목", cell: (item) => <span className="font-medium">{item.subItem}</span> },
    { key: "allocatedAmount", header: "편성액", cell: (item) => formatCurrency(item.allocatedAmount) },
    { key: "executedAmount", header: "집행액", cell: (item) => formatCurrency(item.executedAmount) },
    { 
      key: "rate", 
      header: "집행률",
      cell: (item) => {
        const rate = item.allocatedAmount > 0 ? (item.executedAmount / item.allocatedAmount) * 100 : 0;
        return <span className="font-bold">{rate.toFixed(1)}%</span>;
      }
    },
    { key: "executionMonth", header: "집행월" },
    { 
      key: "reviewStatus", 
      header: "상태",
      cell: (item) => (
        item.reviewStatus === 'approved' 
          ? <Badge className="bg-green-600">승인/완료</Badge> 
          : <Badge variant="secondary">집행 대기</Badge>
      )
    }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="예산 집행현황" description="사업비 편성 및 실 집행 내역 관리">
        <Button onClick={handleExport} variant="outline" size="sm">CSV 다운로드</Button>
      </SectionHeader>

      <DataTable 
        data={budgetItems} 
        columns={columns} 
      />
    </PortalLayout>
  );
}
