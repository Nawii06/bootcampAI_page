import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BusinessYear { id: string; name: string }
interface Indicator { id: string; code: string; name: string; unit: string }
interface Result { id: string; indicatorId: string; actualValue: string; status: string; updatedAt: string }
interface Overview { indicators: Indicator[]; targets: unknown[]; results: Result[] }

export default function AdminPerformanceResults() {
  const queryClient = useQueryClient();
  const [indicatorId, setIndicatorId] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [note, setNote] = useState("");
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => customFetch<{ data: BusinessYear[] }>("/api/v1/reference/business-years?active=true", { responseType: "json" }),
  });
  const yearId = years.data?.data[0]?.id;
  const overview = useQuery({
    queryKey: ["performance", "overview", yearId],
    enabled: Boolean(yearId),
    queryFn: () => customFetch<Overview>(`/api/v1/performance/overview?businessYearId=${yearId}`, { responseType: "json", credentials: "include" }),
  });
  const save = useMutation({
    mutationFn: () => customFetch("/api/v1/performance-results", {
      method: "PUT",
      responseType: "json",
      credentials: "include",
      body: JSON.stringify({
        indicatorId,
        businessYearId: yearId,
        actualValue: Number(actualValue),
        calculationSnapshot: { note, recordedAt: new Date().toISOString() },
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "overview", yearId] });
      setActualValue("");
      setNote("");
    },
  });
  const columns: ColumnDef<Result>[] = [
    {
      key: "indicatorId",
      header: "성과지표",
      cell: (row) => overview.data?.indicators.find((item) => item.id === row.indicatorId)?.name ?? row.indicatorId,
    },
    { key: "actualValue", header: "실적값" },
    { key: "status", header: "공개상태", cell: (row) => <Badge variant={row.status === "PUBLISHED" ? "default" : "secondary"}>{row.status}</Badge> },
    { key: "updatedAt", header: "수정일시", cell: (row) => new Date(row.updatedAt).toLocaleString("ko-KR") },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="연도별 성과실적" description={`${years.data?.data[0]?.name ?? "활성 사업연도"} 실적과 산정근거 snapshot을 저장합니다.`} />
      <div className="mb-6 grid gap-3 rounded-md border bg-card p-5 md:grid-cols-[1fr_180px_1fr_auto]">
        <select className="h-10 rounded-md border bg-background px-3" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}>
          <option value="">성과지표 선택</option>
          {(overview.data?.indicators ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <Input type="number" value={actualValue} onChange={(event) => setActualValue(event.target.value)} placeholder="실적값" />
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="산정근거" />
        <Button disabled={!indicatorId || !yearId || actualValue === "" || !note.trim() || save.isPending} onClick={() => save.mutate()}>실적 저장</Button>
      </div>
      {save.isError && <p className="mb-4 text-destructive">{save.error.message}</p>}
      <DataTable data={overview.data?.results ?? []} columns={columns} />
    </PortalLayout>
  );
}
