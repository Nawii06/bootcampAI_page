import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  PerformanceOverviewResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { useHighlightParam } from "@/hooks/useHighlightParam";
import { NoActiveYearNotice } from "@/components/NoActiveYearNotice";

interface Indicator { id: string; code: string; name: string; category: string; unit: string; description?: string }

export default function AdminPerformanceIndicators() {
  const highlightId = useHighlightParam();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Indicator>();
  const [value, setValue] = useState("");
  const [rationale, setRationale] = useState("");
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const overview = useQuery({
    queryKey: ["performance", "overview", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(PerformanceOverviewResponseSchema, `/api/v1/performance/overview?businessYearId=${yearId}`, { credentials: "include" }),
  });
  const save = useMutation({
    mutationFn: () => customFetch("/api/v1/performance-targets", {
      method: "POST",
      responseType: "json",
      credentials: "include",
      body: JSON.stringify({
        indicatorId: selected!.id,
        businessYearId: yearId,
        targetValue: Number(value),
        version: new Date().toISOString(),
        rationale,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "overview", yearId] });
      setValue("");
      setRationale("");
    },
  });
  const columns: ColumnDef<Indicator>[] = [
    { key: "code", header: "코드" },
    { key: "name", header: "성과지표" },
    { key: "category", header: "분류" },
    { key: "unit", header: "단위" },
    {
      key: "target",
      header: "최신 목표",
      cell: (row) => {
        const target = overview.data?.targets.find((item) => item.indicatorId === row.id);
        return target ? `${Number(target.targetValue)}${row.unit} · ${target.version}` : "-";
      },
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="성과지표·목표 관리" description="지표 정의와 사업연도별 목표 버전을 관리합니다." />
      {years.isLoading || overview.isLoading ? (
        <LoadingCard message="성과지표 목록을 불러오는 중입니다." />
      ) : (
        <>
      {years.isSuccess && years.data.data.length === 0 && (
        <NoActiveYearNotice className="mb-6" />
      )}
      {years.isError && (
        <ErrorCard
          className="mb-6"
          message="사업연도 정보를 불러오지 못했습니다."
          onRetry={() => years.refetch()}
          isRetrying={years.isFetching}
        />
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DataTable
          data={overview.data?.indicators ?? []}
          columns={columns}
          onRowClick={(row) => setSelected(row)}
          highlightId={highlightId}
          highlightMissingMessage="해당 성과지표를 찾을 수 없습니다."
        />
        <div className="rounded-md border bg-card p-5">
          <h2 className="font-semibold">목표 새 버전 등록</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">{selected?.name ?? "왼쪽에서 지표를 선택하세요."}</p>
          <div className="space-y-3">
            <Input type="number" value={value} onChange={(event) => setValue(event.target.value)} placeholder="목표값" />
            <Input value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="설정 또는 변경 근거" />
            <Button className="w-full" disabled={!selected || !yearId || value === "" || !rationale.trim() || save.isPending} onClick={() => save.mutate()}>
              목표 버전 저장
            </Button>
            {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
          </div>
        </div>
      </div>
        </>
      )}
    </PortalLayout>
  );
}
