import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  PerformanceSourceSummaryResponseSchema,
  type PerformanceSourceRow as SourceRow,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { useHighlightParam } from "@/hooks/useHighlightParam";

export default function AdminPerformanceSourceData() {
  const highlightId = useHighlightParam();
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const summary = useQuery({
    queryKey: ["performance", "source-summary", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(
      PerformanceSourceSummaryResponseSchema,
      `/api/v1/performance/source-summary?businessYearId=${yearId}`,
      { credentials: "include" },
    ),
  });
  const columns: ColumnDef<SourceRow>[] = [
    { key: "domain", header: "원천 도메인" },
    { key: "table", header: "DB 테이블" },
    { key: "count", header: "현재 데이터 건수", cell: (row) => `${row.count.toLocaleString("ko-KR")}건` },
    {
      key: "yearScoped",
      header: "집계 기준",
      cell: (row) => <Badge variant={row.yearScoped ? "default" : "outline"}>{row.yearScoped ? "사업연도" : "전체 누적"}</Badge>,
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="성과 원천데이터 현황" description={`${years.data?.data[0]?.name ?? "활성 사업연도"} 성과 산출에 사용하는 운영 DB 현황`} />
      <p className="mb-4 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        이 화면은 seed 샘플이 아니라 실제 운영 테이블을 집계합니다. 개인 단위 원천자료는 노출하지 않습니다.
      </p>
      {years.isLoading || summary.isLoading ? (
        <LoadingCard message="원천데이터 현황을 불러오는 중입니다." />
      ) : (
        <>
          {years.isError && (
            <ErrorCard
              message="사업연도 정보를 불러오지 못했습니다."
              onRetry={() => years.refetch()}
              isRetrying={years.isFetching}
            />
          )}
          {summary.isError && (
            <ErrorCard
              message="원천데이터 집계를 불러오지 못했습니다."
              onRetry={() => summary.refetch()}
              isRetrying={summary.isFetching}
            />
          )}
          <DataTable
            data={summary.data?.data ?? []}
            columns={columns}
            highlightId={highlightId}
            highlightMissingMessage="해당 원천데이터 항목을 찾을 수 없습니다."
          />
        </>
      )}
    </PortalLayout>
  );
}
