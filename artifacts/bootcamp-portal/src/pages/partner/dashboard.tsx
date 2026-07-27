import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import { CompanyParticipationListResponseSchema } from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorCard } from "@/components/ErrorCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function PartnerDashboard() {
  const activities = useQuery({
    queryKey: ["partner", "company-participations"],
    queryFn: () => contractFetch(
      CompanyParticipationListResponseSchema,
      "/api/v1/company-participations",
      { credentials: "include" },
    ),
  });
  const rows = activities.data?.data ?? [];
  return (
    <PortalLayout>
      <SectionHeader
        title="기업 대시보드"
        description={`${activities.data?.company.name ?? "참여기업"} 산학협력 활동 현황`}
      />

      {/* ── Skeleton: 3 stat cards + recent activity list ── */}
      {activities.isLoading && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-3.5 w-24" />
                  <Skeleton className="h-7 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-4 w-24" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between border-b pb-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Real content ── */}
      {!activities.isLoading && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <StatCard label="수요조사" value={`${rows.filter((row) => row.participationType === "DEMAND_SURVEY").length}건`} />
            <StatCard label="프로젝트 제안" value={`${rows.filter((row) => row.participationType === "PROJECT").length}건`} />
            <StatCard label="현장실습·인턴십·채용" value={`${rows.filter((row) => ["FIELD_PRACTICE", "INTERNSHIP", "EMPLOYMENT"].includes(row.participationType)).length}건`} />
          </div>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold">최근 등록 활동</h2>
              <div className="mt-4 space-y-3">
                {rows.slice(-5).reverse().map((row) => (
                  <div key={row.id} className="flex justify-between border-b pb-3 text-sm">
                    <span>{row.title}</span>
                    <span className="text-muted-foreground">{row.participationType}</span>
                  </div>
                ))}
                {rows.length === 0 && <p className="text-sm text-muted-foreground">등록된 기업 활동이 없습니다.</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activities.isError && (
        <ErrorCard
          message="승인 기업 연결정보 또는 활동내역을 불러오지 못했습니다."
          onRetry={() => activities.refetch()}
          isRetrying={activities.isFetching}
        />
      )}
    </PortalLayout>
  );
}
