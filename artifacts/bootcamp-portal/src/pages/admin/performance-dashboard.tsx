import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  PerformanceOverviewResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

interface Indicator { id: string; code: string; name: string; category: string; unit: string }
interface Row extends Indicator { target?: number; actual?: number; rate?: number; status?: string }

export default function AdminPerformanceDashboard() {
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
  const data = overview.data;
  const rows: Row[] = (data?.indicators ?? []).map((indicator) => {
    const target = data?.targets.find((item) => item.indicatorId === indicator.id);
    const result = data?.results.find((item) => item.indicatorId === indicator.id);
    const targetValue = target ? Number(target.targetValue) : undefined;
    const actualValue = result ? Number(result.actualValue) : undefined;
    return {
      ...indicator,
      target: targetValue,
      actual: actualValue,
      rate: targetValue && actualValue !== undefined ? Math.round((actualValue / targetValue) * 1000) / 10 : undefined,
      status: result?.status,
    };
  });
  const measured = rows.filter((row) => row.actual !== undefined);
  const risk = rows.filter((row) => row.rate !== undefined && row.rate < 70).length;
  const columns: ColumnDef<Row>[] = [
    { key: "code", header: "코드" },
    { key: "name", header: "성과지표" },
    { key: "category", header: "분류" },
    { key: "target", header: "목표", cell: (row) => row.target === undefined ? "-" : `${row.target}${row.unit}` },
    { key: "actual", header: "실적", cell: (row) => row.actual === undefined ? "-" : `${row.actual}${row.unit}` },
    { key: "rate", header: "달성률", cell: (row) => row.rate === undefined ? "-" : `${row.rate}%` },
    { key: "status", header: "공개상태", cell: (row) => <Badge variant={row.status === "PUBLISHED" ? "default" : "secondary"}>{row.status ?? "미입력"}</Badge> },
  ];
  const isLoading = years.isLoading || overview.isLoading;
  return (
    <PortalLayout>
      <SectionHeader title="성과관리 대시보드" description={`${years.data?.data[0]?.name ?? "활성 사업연도"} 목표·실적 현황`} />
      {isLoading ? (
        <LoadingCard message="성과관리 현황을 불러오는 중입니다." />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard label="성과지표" value={`${rows.length}개`} />
            <StatCard label="실적 입력" value={`${measured.length}개`} />
            <StatCard label="공개 승인" value={`${rows.filter((row) => row.status === "PUBLISHED").length}개`} />
            <StatCard label="달성률 70% 미만" value={`${risk}개`} color={risk ? "text-destructive" : ""} />
          </div>
          {years.isError && (
            <ErrorCard
              message="사업연도 정보를 불러오지 못했습니다."
              onRetry={() => years.refetch()}
              isRetrying={years.isFetching}
            />
          )}
          {overview.isError && (
            <ErrorCard
              message="성과 현황을 불러오지 못했습니다."
              onRetry={() => overview.refetch()}
              isRetrying={overview.isFetching}
            />
          )}
          <DataTable data={rows} columns={columns} />
        </>
      )}
    </PortalLayout>
  );
}
