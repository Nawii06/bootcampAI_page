import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BenefitBulkCalculationResponseSchema,
  BenefitOperationsResponseSchema,
  type BenefitBulkCalculationResponse,
  type BenefitOperationsResponse,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";

const api = <T,>(url: string, options?: RequestInit) =>
  customFetch<T>(url, { responseType: "json", credentials: "include", ...options });
const money = (value: string | number) => `${Number(value).toLocaleString("ko-KR")}원`;

export default function AdminBenefits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bulkResult, setBulkResult] = useState<BenefitBulkCalculationResponse>();
  const operations = useQuery({
    queryKey: ["admin", "benefit-operations"],
    queryFn: () => contractFetch(
      BenefitOperationsResponseSchema,
      "/api/v1/benefit-operations",
      { credentials: "include" },
    ) as Promise<BenefitOperationsResponse>,
  });
  const mutation = useMutation({
    mutationFn: ({ url, method = "POST", body }: { url: string; method?: string; body: unknown }) =>
      api(url, { method, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "benefit-operations"] }),
  });
  const bulkMutation = useMutation({
    mutationFn: ({ policyId, dryRun }: { policyId: string; dryRun: boolean }) =>
      api<unknown>("/api/v1/benefit-candidates/bulk-calculate", {
        method: "POST",
        body: JSON.stringify({ policyId, dryRun }),
      }).then((response) => BenefitBulkCalculationResponseSchema.parse(response)),
    onSuccess: (result) => {
      setBulkResult(result);
      if (!result.dryRun) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "benefit-operations"] });
      }
    },
  });
  const canApprove = user?.roles?.some((role) => ["BENEFIT_STAFF", "REVIEWER", "SYSTEM_ADMIN"].includes(role));
  const canPay = user?.roles?.some((role) => ["BENEFIT_STAFF", "SYSTEM_ADMIN"].includes(role));
  const canManagePolicy = user?.roles?.some((role) => ["BENEFIT_STAFF", "SYSTEM_ADMIN"].includes(role));
  const changePolicyStatus = (
    policyId: string,
    status: "OPEN" | "CLOSED" | "ARCHIVED",
  ) => {
    const reason = window.prompt("상태변경 사유를 5자 이상 입력하세요.");
    if (!reason || reason.trim().length < 5) return;
    mutation.mutate({
      url: `/api/v1/benefit-policies/${policyId}/status`,
      method: "PATCH",
      body: { status, reason: reason.trim() },
    });
  };

  return (
    <PortalLayout>
      <SectionHeader title="수혜정책·대상자" description="정책 계산결과를 검토하고 승인액과 대학 ERP 지급상태를 분리하여 관리합니다." />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="정책" value={operations.data?.policies.length ?? 0} />
        <Metric label="검토대상" value={operations.data?.candidates.filter((row) => row.status === "REVIEWING").length ?? 0} />
        <Metric label="승인" value={operations.data?.approvals.filter((row) => row.decision === "APPROVED").length ?? 0} />
        <Metric label="지급완료" value={operations.data?.payments.filter((row) => row.status === "PAID").length ?? 0} />
      </div>
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">수혜정책 운영상태</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(operations.data?.policies ?? []).map((policy) => (
            <article key={policy.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{policy.name}</p>
                  <p className="text-sm text-muted-foreground">{policy.code}</p>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs">{policy.status}</span>
              </div>
              {canManagePolicy && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {policy.status === "DRAFT" && (
                    <Button size="sm" disabled={mutation.isPending} onClick={() => changePolicyStatus(policy.id, "OPEN")}>
                      시행
                    </Button>
                  )}
                  {policy.status === "OPEN" && (
                    <>
                      <Button size="sm" variant="outline" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate({ policyId: policy.id, dryRun: true })}>
                        대상자 미리보기
                      </Button>
                      <Button
                        size="sm"
                        disabled={bulkMutation.isPending}
                        onClick={() => {
                          if (window.confirm("DB 사실값으로 대상자를 재산정하고 저장하시겠습니까? 승인 완료 건은 변경되지 않습니다.")) {
                            bulkMutation.mutate({ policyId: policy.id, dryRun: false });
                          }
                        }}
                      >
                        일괄 산정 확정
                      </Button>
                      <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => changePolicyStatus(policy.id, "CLOSED")}>
                        접수마감
                      </Button>
                    </>
                  )}
                  {["DRAFT", "CLOSED"].includes(policy.status) && (
                    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => changePolicyStatus(policy.id, "ARCHIVED")}>
                      보관
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      {bulkResult && (
        <section className="mb-8 rounded-lg border bg-card p-4" aria-live="polite">
          <p className="font-medium">
            {bulkResult.dryRun ? "일괄 산정 미리보기" : "일괄 산정 확정 결과"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            평가 {bulkResult.evaluated}명 · 적격 {bulkResult.eligible}명 · 부적격 {bulkResult.ineligible}명 ·
            저장 {bulkResult.committed}명 · 승인완료 제외 {bulkResult.skippedDecided}명
          </p>
        </section>
      )}
      <div className="space-y-4">
        {(operations.data?.candidates ?? []).map((candidate) => {
          const policy = operations.data?.policies.find((row) => row.id === candidate.policyId);
          const student = operations.data?.students.find((row) => row.id === candidate.studentId);
          const approval = operations.data?.approvals.find((row) => row.candidateId === candidate.id);
          const payment = operations.data?.payments.find((row) => row.approvalId === approval?.id);
          return (
            <article key={candidate.id} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{policy?.name ?? "수혜정책"}</p>
                  <p className="text-sm text-muted-foreground">
                    {student?.name ?? student?.studentNumber ?? candidate.studentId} · 계산액 {money(candidate.calculatedAmount)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>대상자 {candidate.status}</p>
                  <p>승인 {approval?.decision ?? "미결정"}</p>
                  <p>지급 {payment?.status ?? "미등록"}</p>
                  {payment?.erpReference && <p>ERP {payment.erpReference}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canApprove && candidate.status === "REVIEWING" && (
                  <>
                    <Button disabled={mutation.isPending} onClick={() => mutation.mutate({
                      url: "/api/v1/benefit-approvals",
                      body: { candidateId: candidate.id, decision: "APPROVED", approvedAmount: Number(candidate.calculatedAmount), note: "계산결과 검토 완료" },
                    })}>계산액 승인</Button>
                    <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({
                      url: "/api/v1/benefit-approvals",
                      body: { candidateId: candidate.id, decision: "REJECTED", approvedAmount: 0, note: "자격요건 재검토" },
                    })}>반려</Button>
                  </>
                )}
                {canPay && approval?.decision === "APPROVED" && !payment && (
                  <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({
                    url: "/api/v1/benefit-payments",
                    method: "PUT",
                    body: { approvalId: approval.id, amount: Number(approval.approvedAmount), status: "REQUESTED" },
                  })}>ERP 지급요청 등록</Button>
                )}
                {canPay && payment?.status === "REQUESTED" && (
                  <Button disabled={mutation.isPending} onClick={() => mutation.mutate({
                    url: "/api/v1/benefit-payments",
                    method: "PUT",
                    body: {
                      approvalId: approval!.id,
                      amount: Number(approval!.approvedAmount),
                      status: "PAID",
                      erpReference: `ERP-${new Date().getFullYear()}-PREVIEW`,
                      paidAt: new Date().toISOString(),
                    },
                  })}>ERP 지급완료 반영</Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {operations.isLoading && <p className="text-sm text-muted-foreground">수혜업무를 불러오는 중입니다.</p>}
      {operations.isError && (
        <ErrorCard
          message={operations.error?.message}
          onRetry={() => operations.refetch()}
          isRetrying={operations.isFetching}
        />
      )}
      {(mutation.isError || bulkMutation.isError) && (
        <p className="mt-4 text-sm text-destructive">
          {(mutation.error ?? bulkMutation.error)?.message}
        </p>
      )}
    </PortalLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
