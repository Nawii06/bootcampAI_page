import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PerformanceIndicator, PerformanceResult, ResultStatus } from "../types";
import { createPerformanceResult, updatePerformanceResult } from "../performanceService";

interface PerformanceResultFormProps {
  indicators: PerformanceIndicator[];
  year: number;
  existing?: PerformanceResult;
  onSaved: () => void;
}

export function PerformanceResultForm({ indicators, year, existing, onSaved }: PerformanceResultFormProps) {
  const [indicatorId, setIndicatorId] = useState(existing?.indicator_id ?? indicators[0]?.id ?? "");
  const [actual, setActual] = useState(String(existing?.actual_value ?? ""));
  const [numerator, setNumerator] = useState(String(existing?.numerator ?? ""));
  const [denominator, setDenominator] = useState(String(existing?.denominator ?? ""));
  const [note, setNote] = useState(existing?.calculation_note ?? "");
  const [status, setStatus] = useState<ResultStatus>(existing?.input_status ?? "draft");

  function save() {
    const base = {
      indicator_id: indicatorId,
      business_year: year,
      actual_value: actual === "" ? null : Number(actual),
      numerator: numerator === "" ? null : Number(numerator),
      denominator: denominator === "" ? null : Number(denominator),
      calculation_note: note,
      input_status: status,
      evidence_status: existing?.evidence_status ?? "none",
      created_by: "admin",
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (existing) updatePerformanceResult(existing.id, base);
    else createPerformanceResult({ id: `pr-${Date.now()}`, ...base });
    onSaved();
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm font-medium">지표
          <select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}>
            {indicators.map((item) => <option key={item.id} value={item.id}>{item.indicator_name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">실적값<Input className="mt-1" value={actual} onChange={(event) => setActual(event.target.value)} /></label>
        <label className="text-sm font-medium">승인상태
          <select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={status} onChange={(event) => setStatus(event.target.value as ResultStatus)}>
            {["draft", "submitted", "reviewed", "approved", "rejected"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">분자<Input className="mt-1" value={numerator} onChange={(event) => setNumerator(event.target.value)} /></label>
        <label className="text-sm font-medium">분모<Input className="mt-1" value={denominator} onChange={(event) => setDenominator(event.target.value)} /></label>
        <label className="text-sm font-medium md:col-span-3">산출근거<Input className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </div>
      <Button onClick={save}>실적 저장</Button>
    </div>
  );
}
