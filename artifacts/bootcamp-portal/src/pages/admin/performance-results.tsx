import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  PerformanceOverviewResponseSchema,
  BusinessYearListResponseSchema,
  StoredFileListResponseSchema,
  PerformanceCalculationResponseSchema,
  type PerformanceCalculationResponse,
  type PerformanceOverviewResponse as Overview,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

type Result = Overview["results"][number];

export default function AdminPerformanceResults() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [indicatorId, setIndicatorId] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [note, setNote] = useState("");
  const [calculation, setCalculation] = useState<PerformanceCalculationResponse>();
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const overview = useQuery({
    queryKey: ["performance", "overview", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(
      PerformanceOverviewResponseSchema,
      `/api/v1/performance/overview?businessYearId=${yearId}`,
      { credentials: "include" },
    ),
  });
  const canEdit = user?.roles?.some((role) => ["PERFORMANCE_STAFF", "SYSTEM_ADMIN"].includes(role));
  const canApprove = user?.roles?.some((role) => ["REVIEWER", "SYSTEM_ADMIN"].includes(role));
  const files = useQuery({
    queryKey: ["admin", "stored-files", "performance-result-link"],
    enabled: Boolean(canEdit),
    queryFn: () => contractFetch(StoredFileListResponseSchema, "/api/v1/files", { credentials: "include" }),
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
  const calculate = useMutation({
    mutationFn: ({ dryRun }: { dryRun: boolean }) =>
      customFetch<unknown>("/api/v1/performance-results/calculate", {
        method: "POST", responseType: "json", credentials: "include",
        body: JSON.stringify({ indicatorId, businessYearId: yearId, dryRun }),
      }).then((response) => PerformanceCalculationResponseSchema.parse(response)),
    onSuccess: (result) => {
      setCalculation(result);
      if (!result.dryRun) {
        void queryClient.invalidateQueries({ queryKey: ["performance", "overview", yearId] });
      }
    },
  });
  const workflow = useMutation({
    mutationFn: ({ url, body }: { url: string; body?: unknown }) => customFetch(url, {
      method: "POST", responseType: "json", credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance", "overview", yearId] }),
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
    {
      key: "actions",
      header: "증빙·Workflow",
      cell: (row) => {
        const evidenceCount = overview.data?.evidence.filter((item) => item.resultId === row.id).length ?? 0;
        return <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">증빙 {evidenceCount}건</span>
          {canEdit && evidenceCount === 0 && files.data?.data[0] && (
            <Button size="sm" variant="outline" disabled={workflow.isPending} onClick={() => workflow.mutate({
              url: "/api/v1/performance-evidence",
              body: { resultId: row.id, fileId: files.data!.data[0]!.id, description: "성과 산정 증빙" },
            })}>첫 파일 연결</Button>
          )}
          {canEdit && row.status === "DRAFT" && (
            <Button size="sm" variant="outline" disabled={workflow.isPending} onClick={() => workflow.mutate({
              url: `/api/v1/performance-results/${row.id}/submit-review`,
            })}>검토요청</Button>
          )}
          {canApprove && row.status === "IN_REVIEW" && (
            <Button size="sm" disabled={!evidenceCount || workflow.isPending} onClick={() => workflow.mutate({
              url: `/api/v1/performance-results/${row.id}/approve-public`,
            })}>공개승인</Button>
          )}
        </div>;
      },
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="연도별 성과실적" description={`${years.data?.data[0]?.name ?? "활성 사업연도"} 실적과 산정근거 snapshot을 저장합니다.`} />
      {years.isLoading || overview.isLoading || files.isLoading ? (
        <LoadingCard message="성과실적을 불러오는 중입니다." />
      ) : (
        <>
      {years.isError && (
        <ErrorCard
          className="mb-6"
          message="사업연도 정보를 불러오지 못했습니다."
          onRetry={() => years.refetch()}
          isRetrying={years.isFetching}
        />
      )}
      {canEdit && <div className="mb-6 grid gap-3 rounded-md border bg-card p-5 md:grid-cols-[1fr_180px_1fr_auto]">
        <select className="h-10 rounded-md border bg-background px-3" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}>
          <option value="">성과지표 선택</option>
          {(overview.data?.indicators ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <Input type="number" value={actualValue} onChange={(event) => setActualValue(event.target.value)} placeholder="실적값" />
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="산정근거" />
        <Button disabled={!indicatorId || !yearId || actualValue === "" || !note.trim() || save.isPending} onClick={() => save.mutate()}>실적 저장</Button>
        <div className="flex gap-2 md:col-span-4">
          <Button variant="outline" disabled={!indicatorId || !yearId || calculate.isPending} onClick={() => calculate.mutate({ dryRun: true })}>
            DB 산정 미리보기
          </Button>
          <Button disabled={!indicatorId || !yearId || calculate.isPending} onClick={() => calculate.mutate({ dryRun: false })}>
            DB 산정 확정
          </Button>
          {calculation && (
            <span className="self-center text-sm text-muted-foreground">
              {calculation.dryRun ? "미리보기" : "확정"} 결과 {calculation.actualValue}
            </span>
          )}
        </div>
      </div>}
      {(save.isError || workflow.isError || calculate.isError) && <p className="mb-4 text-destructive">{(save.error ?? workflow.error ?? calculate.error)?.message}</p>}
      <DataTable data={overview.data?.results ?? []} columns={columns} />
        </>
      )}
    </PortalLayout>
  );
}
