import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { exportService } from "../../services/exportService";
import { KpiItem } from "../../types";
import { ProgressBar } from "../../components/ProgressBar";
import { Button } from "@/components/ui/button";

export default function AdminKpi() {
  const [kpis, setKpis] = useState<KpiItem[]>([]);

  useEffect(() => {
    setKpis(storageService.get<KpiItem>("kpis"));
  }, []);

  const handleExport = () => {
    const cols = [
      { key: "category", label: "구분" },
      { key: "name", label: "지표명" },
      { key: "targetValue", label: "목표" },
      { key: "actualValue", label: "실적" },
      { key: "unit", label: "단위" },
      { key: "responsibleDept", label: "담당부서" }
    ] as any;
    exportService.downloadCsv("kpi_export", kpis, cols);
  };

  const columns: ColumnDef<KpiItem>[] = [
    { key: "category", header: "구분" },
    { key: "name", header: "지표명", cell: (item) => <span className="font-bold">{item.name}</span> },
    { key: "targetValue", header: "목표", cell: (item) => `${item.targetValue}${item.unit}` },
    { key: "actualValue", header: "실적", cell: (item) => `${item.actualValue}${item.unit}` },
    { 
      key: "achievement", 
      header: "달성률",
      cell: (item) => {
        const rate = (item.actualValue / item.targetValue) * 100;
        return <ProgressBar value={rate} colorScheme="auto" className="w-32" />;
      }
    },
    { key: "responsibleDept", header: "담당부서" }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="성과지표(KPI) 관리" description="부트캠프 핵심 성과 지표 모니터링">
        <Button onClick={handleExport} variant="outline" size="sm">CSV 다운로드</Button>
      </SectionHeader>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded border">
          💡 달성률 70% 미만 항목은 <strong className="text-destructive">빨간색</strong>, 
          70~90%는 <strong className="text-yellow-600">노란색</strong>, 
          90% 이상은 <strong className="text-green-600">초록색</strong>으로 표시됩니다.
        </p>
      </div>

      <DataTable 
        data={kpis} 
        columns={columns} 
      />
    </PortalLayout>
  );
}
