import { useMemo, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryFilter } from "@/performance/components/CategoryFilter";
import { IndicatorDetailPanel } from "@/performance/components/IndicatorDetailPanel";
import { IndicatorTable } from "@/performance/components/IndicatorTable";
import { TargetVersionHistory } from "@/performance/components/TargetVersionHistory";
import type { IndicatorType, PerformanceIndicator } from "@/performance/types";
import { getIndicators, getPerformanceResults, getTargetVersions, updateIndicator } from "@/performance/performanceService";

export default function AdminPerformanceIndicators() {
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<IndicatorType | "all">("all");
  const [selected, setSelected] = useState<PerformanceIndicator | undefined>();
  const [reason, setReason] = useState("");
  const [year1Target, setYear1Target] = useState("");
  const [refresh, setRefresh] = useState(0);
  const indicators = getIndicators();
  const results = getPerformanceResults(2026);
  const categories = Array.from(new Set(indicators.map((item) => item.category)));
  const filtered = useMemo(() => indicators.filter((item) => (category === "all" || item.category === category) && (type === "all" || item.indicator_type === type)), [indicators, category, type, refresh]);

  function saveTarget() {
    if (!selected || !reason.trim()) return;
    const targets = [...selected.targets] as PerformanceIndicator["targets"];
    targets[0] = year1Target === "" ? null : Number(year1Target);
    const next = updateIndicator(selected.id, { targets, change_reason: reason });
    if (next) {
      setSelected(next);
      setRefresh((value) => value + 1);
      setReason("");
    }
  }

  return (
    <PortalLayout>
      <SectionHeader title="성과지표 목표 관리" description="총괄표 기준 v1 목표값, 지표 정의, 산식, 증빙자료와 목표값 수정 이력을 관리합니다." />
      <div className="flex flex-wrap gap-3 mb-4">
        <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        <label className="text-sm font-medium flex items-center gap-2">지표구분
          <select className="h-9 rounded-md border bg-background px-3" value={type} onChange={(event) => setType(event.target.value as IndicatorType | "all")}>
            <option value="all">전체</option>
            <option value="common">공통지표</option>
            <option value="autonomous">자율지표</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <IndicatorTable indicators={filtered} results={results} year={2026} onSelect={(indicator) => {
          setSelected(indicator);
          setYear1Target(String(indicator.targets[0] ?? ""));
        }} />
        <div className="space-y-4">
          <IndicatorDetailPanel indicator={selected} />
          {selected && (
            <div className="rounded-md border bg-card p-4 space-y-3">
              <h3 className="font-semibold">1차년도 목표값 수정</h3>
              <Input value={year1Target} onChange={(event) => setYear1Target(event.target.value)} placeholder="목표값" />
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="변경사유 필수" />
              <Button onClick={saveTarget} disabled={!reason.trim()}>목표값 저장</Button>
            </div>
          )}
          <TargetVersionHistory versions={getTargetVersions(selected?.id)} />
        </div>
      </div>
    </PortalLayout>
  );
}
