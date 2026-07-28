import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  PerformanceOverviewResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { NoActiveYearNotice } from "@/components/NoActiveYearNotice";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AdminPerformanceExport() {
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const year = years.data?.data[0];
  const overview = useQuery({
    queryKey: ["performance", "overview", year?.id],
    enabled: Boolean(year?.id),
    queryFn: () => contractFetch(PerformanceOverviewResponseSchema, `/api/v1/performance/overview?businessYearId=${year!.id}`, { credentials: "include" }),
  });
  function download() {
    if (!overview.data || !year) return;
    const rows = overview.data.indicators.map((indicator) => {
      const target = overview.data.targets.find((item) => item.indicatorId === indicator.id);
      const result = overview.data.results.find((item) => item.indicatorId === indicator.id);
      const targetValue = target ? Number(target.targetValue) : undefined;
      const actualValue = result ? Number(result.actualValue) : undefined;
      const rate = targetValue && actualValue !== undefined ? (actualValue / targetValue) * 100 : undefined;
      return [indicator.code, indicator.name, indicator.category, indicator.unit, targetValue, actualValue, rate?.toFixed(1), result?.status, target?.version];
    });
    const csv = [
      ["지표코드", "지표명", "분류", "단위", "목표", "실적", "달성률(%)", "공개상태", "목표버전"],
      ...rows,
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `performance_summary_${year.year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <PortalLayout>
      <SectionHeader title="성과자료 내보내기" description="현재 DB에 저장된 목표·실적·공개상태를 CSV로 내보냅니다." />
      {years.isLoading || overview.isLoading ? (
        <LoadingCard className="max-w-xl" message="내보내기 정보를 불러오는 중입니다." />
      ) : (
        <>
          {years.isSuccess && years.data.data.length === 0 && (
            <NoActiveYearNotice className="mb-6 max-w-xl" />
          )}
          {years.isError && (
            <ErrorCard
              className="mb-6 max-w-xl"
              message="사업연도 정보를 불러오지 못했습니다."
              onRetry={() => years.refetch()}
              isRetrying={years.isFetching}
            />
          )}
          <Card className="max-w-xl"><CardContent className="p-6">
            <h2 className="font-semibold">{year?.name ?? "활성 사업연도"}</h2>
            <p className="my-3 text-sm text-muted-foreground">
              개인정보를 포함하지 않는 성과지표 집계자료입니다. 외부 제출 전 승인상태와 산정근거를 다시 확인하세요.
            </p>
            <Button onClick={download} disabled={!overview.data || overview.isLoading}>성과 집계 CSV 다운로드</Button>
          </CardContent></Card>
        </>
      )}
    </PortalLayout>
  );
}
