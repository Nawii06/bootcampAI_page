import { useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { ExportPanel } from "@/performance/components/ExportPanel";
import { YearSelector } from "@/performance/components/YearSelector";

export default function AdminPerformanceExport() {
  const [year, setYear] = useState(2026);
  return (
    <PortalLayout>
      <SectionHeader title="보고서 및 Excel 다운로드" description="연차보고서, K-PASS 입력, 증빙 체크리스트용 Excel 파일을 다운로드합니다.">
        <YearSelector value={year} onChange={setYear} />
      </SectionHeader>
      <ExportPanel year={year} />
    </PortalLayout>
  );
}
