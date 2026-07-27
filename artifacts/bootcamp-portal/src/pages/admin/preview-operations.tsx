import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  FakeOperationsResponseSchema,
  type FakeOperationsResponse as OperationsResponse,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";

const roleSections: Record<string, Array<keyof OperationsResponse["operations"]>> = {
  BENEFIT_STAFF: ["benefitPolicies"],
  COMPANY_STAFF: ["companyApplications"],
  CONTENT_EDITOR: ["contentWorkflow"],
  REVIEWER: ["reviewQueue", "benefitPolicies", "contentWorkflow"],
  AUDITOR: ["reviewQueue", "benefitPolicies", "companyApplications", "contentWorkflow"],
  SYSTEM_ADMIN: ["reviewQueue", "benefitPolicies", "companyApplications", "contentWorkflow"],
};

const sectionLabels: Record<keyof OperationsResponse["operations"], string> = {
  benefitPolicies: "수혜정책·대상자 현황",
  companyApplications: "기업 참여신청 현황",
  contentWorkflow: "CMS 작성·검토·게시 현황",
  reviewQueue: "통합 검토대기",
};

export default function AdminPreviewOperations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const operations = useQuery({
    queryKey: ["fake-data", "operations"],
    queryFn: () => contractFetch(FakeOperationsResponseSchema, "/api/v1/fake-data/operations", {
      credentials: "include",
    }),
  });
  const reset = useMutation({
    mutationFn: () => customFetch("/api/v1/fake-data/reset", {
      method: "POST",
      responseType: "json",
      credentials: "include",
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fake-data"] }),
  });
  const role = user?.roles?.includes("SYSTEM_ADMIN")
    ? "SYSTEM_ADMIN"
    : operations.data?.role ?? user?.roles?.[0] ?? "";
  const sections = roleSections[role] ?? ["reviewQueue"];

  return (
    <PortalLayout>
      <SectionHeader
        title="FD_Set_01 역할별 업무현황"
        description={`${role || "업무 담당자"} 시나리오용 메모리 데이터 조회 화면입니다.`}
      />
      {role === "SYSTEM_ADMIN" && (
        <div className="mb-6 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-950">메모리 변경사항과 fake 감사로그를 원본 상태로 초기화합니다.</p>
          <Button variant="destructive" onClick={() => reset.mutate()} disabled={reset.isPending}>
            {reset.isPending ? "초기화 중..." : "FD_Set_01 초기화"}
          </Button>
        </div>
      )}
            {operations.isError && (
        <ErrorCard
          message="역할별 Preview 데이터를 불러오지 못했습니다."
          onRetry={() => operations.refetch()}
          isRetrying={operations.isFetching}
        />
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => (
          <Card key={section}>
            <CardHeader><CardTitle className="text-lg">{sectionLabels[section]}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(operations.data?.operations[section] ?? []).map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.title ?? item.name ?? item.companyName ?? item.type}</p>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  {item.note && <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>}
                  {(item.candidateCount !== undefined || item.reviewRequired !== undefined || item.paidCount !== undefined) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      후보 {item.candidateCount ?? 0}명 · 검토필요 {item.reviewRequired ?? 0}명 · 지급완료 {item.paidCount ?? 0}명
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {(role === "SYSTEM_ADMIN" || role === "AUDITOR") && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-lg">가상 감사로그</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(operations.data?.auditLogs ?? []).map((item) => (
              <div key={item.id} className="grid gap-1 border-b py-2 text-xs md:grid-cols-4">
                <span>{new Date(item.occurredAt).toLocaleString("ko-KR")}</span>
                <span>{item.actorDisplayName}</span>
                <span>{item.action}</span>
                <span>{item.entityType}</span>
              </div>
            ))}
            {!operations.data?.auditLogs.length && <p className="text-sm text-muted-foreground">기록된 가상 감사로그가 없습니다.</p>}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
