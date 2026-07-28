import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BudgetChangeHistoryResponseSchema,
  type BudgetChangeHistoryItem as BudgetChange,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { useHighlightParam } from "@/hooks/useHighlightParam";

const money = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export default function AdminBudgetLog() {
  const highlightId = useHighlightParam();
  const history = useQuery({
    queryKey: ["admin", "budget-change-history"],
    queryFn: () =>
      contractFetch(BudgetChangeHistoryResponseSchema, "/api/v1/budget/change-history", {
        credentials: "include",
      }),
  });
  const columns: ColumnDef<BudgetChange>[] = [
    {
      key: "changedAt",
      header: "변경일시",
      cell: (row) => new Date(row.changedAt).toLocaleString("ko-KR"),
    },
    { key: "budgetCode", header: "예산코드" },
    { key: "category", header: "분류" },
    {
      key: "fieldName",
      header: "변경항목",
      cell: (row) =>
        row.fieldName === "allocatedAmount" ? "배정액" : "편성액",
    },
    {
      key: "previousAmount",
      header: "변경 전",
      cell: (row) => money.format(Number(row.previousAmount ?? 0)),
    },
    {
      key: "newAmount",
      header: "변경 후",
      cell: (row) => money.format(Number(row.newAmount)),
    },
    { key: "reason", header: "변경사유" },
    { key: "changedByName", header: "변경자" },
  ];

  return (
    <PortalLayout>
      <SectionHeader
        title="예산 변경이력"
        description="배정액과 편성액의 변경사유 및 변경자를 조회합니다."
      />
      {history.isError && (
        <ErrorCard
          message="예산 변경이력을 불러오지 못했습니다."
          onRetry={() => history.refetch()}
          isRetrying={history.isFetching}
        />
      )}
      {history.isLoading ? (
        <LoadingCard message="예산 변경이력을 불러오는 중입니다." />
      ) : (
        <DataTable
          data={history.data?.data ?? []}
          columns={columns}
          highlightId={highlightId}
          highlightMissingMessage="해당 예산 변경이력을 찾을 수 없습니다."
        />
      )}
    </PortalLayout>
  );
}
