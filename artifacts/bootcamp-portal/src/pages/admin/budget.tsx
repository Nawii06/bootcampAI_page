import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import { BudgetOperationsResponseSchema, BudgetSummaryResponseSchema, BusinessYearListResponseSchema, StoredFileListResponseSchema } from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

interface BudgetSummary {
  allocated: number;
  planned: number;
  executed: number;
  balance: number;
  executionRate: number;
}
interface Allocation {
  id: string; programName?: string; budgetCode: string; category: string;
  allocatedAmount: string | number; plannedAmount: string | number;
  internalApprovalNumber?: string; erpReference?: string; rcmsReference?: string;
}
interface Execution { id: string; allocationId: string; amount: string | number; purpose: string; evidenceFileId?: string }
interface Operations { allocations: Allocation[]; executions: Execution[] }

const money = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

export default function AdminBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [evidenceFileId, setEvidenceFileId] = useState("");
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const summary = useQuery({
    queryKey: ["admin", "budget-summary", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(BudgetSummaryResponseSchema, `/api/v1/budget/summary?businessYearId=${yearId}`, {
      credentials: "include",
    }),
  });
  const operations = useQuery({
    queryKey: ["admin", "budget-operations", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(BudgetOperationsResponseSchema, `/api/v1/budget/operations?businessYearId=${yearId}`, {
      credentials: "include",
    }),
  });
  const files = useQuery({
    queryKey: ["admin", "files", "budget-picker"],
    queryFn: () => contractFetch(StoredFileListResponseSchema, "/api/v1/files", {
      credentials: "include",
    }),
  });
  const mutation = useMutation({
    mutationFn: ({ url, body }: { url: string; body: unknown }) =>
      customFetch(url, { method: "POST", responseType: "json", credentials: "include", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "budget-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "budget-operations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "budget-change-history"] });
    },
  });
  const canWrite = user?.roles?.some((role) => ["BUDGET_STAFF", "SYSTEM_ADMIN"].includes(role));
  const firstAllocation = operations.data?.allocations[0];
  const cards = summary.data
    ? [
        ["배정액", money.format(summary.data.allocated)],
        ["편성액", money.format(summary.data.planned)],
        ["집행액", money.format(summary.data.executed)],
        ["잔액", money.format(summary.data.balance)],
        ["집행률", `${summary.data.executionRate}%`],
      ]
    : [];
  return (
    <PortalLayout>
      <SectionHeader title="예산 집행현황" description={years.data?.data[0]?.name ?? "활성 사업연도"} />
      {years.isLoading || files.isLoading ? (
        <LoadingCard message="예산 집행현황을 불러오는 중입니다." />
      ) : (
      <>
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></CardContent></Card>
        ))}
      </div>
      {canWrite && yearId && (
        <div className="my-6 grid gap-3 md:grid-cols-3">
          <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({
            url: "/api/v1/budget/allocations",
            body: {
              businessYearId: yearId, budgetCode: `2026-OPS-${(operations.data?.allocations.length ?? 0) + 1}`,
              category: "프로그램 운영비", allocatedAmount: 50000000, plannedAmount: 40000000,
              internalApprovalNumber: "IA-2026-PREVIEW", erpReference: "ERP-BUDGET-PREVIEW", rcmsReference: "RCMS-PREVIEW",
            },
          })}>예산배정 5천만원 추가</Button>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="budget-evidence-file">집행 증빙파일</label>
            <select
              id="budget-evidence-file"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={evidenceFileId}
              onChange={(event) => setEvidenceFileId(event.target.value)}
            >
              <option value="">증빙 없이 등록</option>
              {(files.data?.data ?? []).map((file) => (
                <option key={file.id} value={file.id}>
                  {file.originalName} · {(file.sizeBytes / 1024).toFixed(1)}KB
                </option>
              ))}
            </select>
            <Button className="w-full" variant="outline" disabled={!firstAllocation || mutation.isPending} onClick={() => firstAllocation && mutation.mutate({
              url: "/api/v1/budget/executions",
              body: {
                allocationId: firstAllocation.id, amount: 1000000, purpose: "교육 프로그램 운영비",
                executedAt: new Date().toISOString(), internalApprovalNumber: "IA-EXEC-PREVIEW",
                erpReference: "ERP-EXEC-PREVIEW", rcmsReference: "RCMS-EXEC-PREVIEW",
                evidenceFileId: evidenceFileId || undefined,
              },
            })}>첫 배정에서 100만원 집행</Button>
          </div>
          <Button variant="outline" disabled={!firstAllocation || mutation.isPending} onClick={() => firstAllocation && mutation.mutate({
            url: "/api/v1/budget/amount-changes",
            body: {
              allocationId: firstAllocation.id, field: "plannedAmount",
              newAmount: Math.min(Number(firstAllocation.allocatedAmount), Number(firstAllocation.plannedAmount) + 1000000),
              reason: "프로그램 운영계획 조정",
            },
          })}>첫 편성액 100만원 증액</Button>
        </div>
      )}
      <section className="mt-7">
        <h2 className="mb-3 font-semibold">프로그램별 예산배정·집행</h2>
        <div className="space-y-3">
          {(operations.data?.allocations ?? []).map((allocation) => {
            const executed = (operations.data?.executions ?? [])
              .filter((row) => row.allocationId === allocation.id)
              .reduce((sum, row) => sum + Number(row.amount), 0);
            const balance = Number(allocation.allocatedAmount) - executed;
            return <article key={allocation.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap justify-between gap-4">
                <div><p className="font-medium">{allocation.budgetCode} · {allocation.category}</p><p className="text-sm text-muted-foreground">{allocation.programName ?? "공통예산"}</p></div>
                <div className="text-right text-sm"><p>배정 {money.format(Number(allocation.allocatedAmount))}</p><p>집행 {money.format(executed)} · 잔액 {money.format(balance)}</p></div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <span>내부결재 {allocation.internalApprovalNumber ?? "-"}</span>
                <span>ERP {allocation.erpReference ?? "-"}</span>
                <span>RCMS {allocation.rcmsReference ?? "-"}</span>
              </div>
              {(operations.data?.executions ?? [])
                .filter((row) => row.allocationId === allocation.id && row.evidenceFileId)
                .map((row) => {
                  const file = files.data?.data.find((item) => item.id === row.evidenceFileId);
                  return (
                    <a
                      key={row.id}
                      className="mt-3 inline-block text-sm text-primary underline"
                      href={`/api/v1/files/${row.evidenceFileId}/download`}
                    >
                      증빙 다운로드 · {file?.originalName ?? row.evidenceFileId}
                    </a>
                  );
                })}
            </article>;
          })}
        </div>
      </section>
      </>
      )}
            {(years.isError || summary.isError || files.isError) && (
        <ErrorCard
          message="예산 또는 증빙파일 API에 연결할 수 없습니다."
          onRetry={() => { years.refetch(); summary.refetch(); files.refetch(); }}
          isRetrying={years.isFetching || summary.isFetching || files.isFetching}
        />
      )}
            {operations.isError && (
        <ErrorCard
          message={operations.error?.message}
          onRetry={() => operations.refetch()}
          isRetrying={operations.isFetching}
        />
      )}
      {mutation.isError && <p className="mt-4 text-destructive">{mutation.error?.message}</p>}
    </PortalLayout>
  );
}
