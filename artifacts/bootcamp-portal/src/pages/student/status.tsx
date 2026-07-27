import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  ProgramApplicationsResponseSchema,
  StudentEmploymentLinksResponseSchema,
  type ProgramApplicationResponse as ApplicationRow,
  type StudentEmploymentLinkResponse,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import type { ApplicationStatus } from "../../types";
import { ErrorCard } from "@/components/ErrorCard";
import { Skeleton } from "@/components/ui/skeleton";

const PARTICIPATION_LABELS: Record<string, string> = {
  EMPLOYMENT: "채용 연계",
  INTERNSHIP: "인턴십",
  FIELD_PRACTICE: "현장실습",
};

function displayStatus(status: string): ApplicationStatus {
  const mapped: Record<string, ApplicationStatus> = {
    SUBMITTED: "submitted",
    REVIEWING: "reviewing",
    SUPPLEMENT_REQUESTED: "supplement",
    SELECTED: "selected",
    WAITLISTED: "waitlisted",
    REJECTED: "rejected",
  };
  return mapped[status] ?? "reviewing";
}

function formatDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(
      new Date(iso),
    );
  if (startsAt && endsAt) return `${fmt(startsAt)} ~ ${fmt(endsAt)}`;
  if (startsAt) return `${fmt(startsAt)} ~`;
  if (endsAt) return `~ ${fmt(endsAt)}`;
  return "기간 미정";
}

export default function StudentStatus() {
  const { user } = useAuth();

  const applications = useQuery({
    queryKey: ["program-applications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () =>
      contractFetch(
        ProgramApplicationsResponseSchema,
        `/api/v1/program-applications?studentId=${encodeURIComponent(user!.id)}`,
        { credentials: "include" },
      ),
  });

  const employmentLinks = useQuery({
    queryKey: ["student", "employment-links", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () =>
      contractFetch(
        StudentEmploymentLinksResponseSchema,
        "/api/v1/my-employment-links",
        { credentials: "include" },
      ),
  });

  const columns: ColumnDef<ApplicationRow>[] = [
    {
      key: "programName",
      header: "프로그램",
      cell: (row) => <span className="font-medium">{row.programName}</span>,
    },
    { key: "sessionName", header: "회차" },
    {
      key: "submittedAt",
      header: "신청일",
      cell: (row) =>
        row.submittedAt
          ? new Intl.DateTimeFormat("ko-KR").format(new Date(row.submittedAt))
          : "-",
    },
    {
      key: "status",
      header: "상태",
      cell: (row) => <StatusBadge status={displayStatus(row.status)} />,
    },
    {
      key: "reviewNote",
      header: "검토 의견",
      cell: (row) => row.reviewNote || "-",
    },
  ];

  return (
    <PortalLayout>
      {/* ── Programme applications ── */}
      <SectionHeader
        title="신청현황"
        description="프로그램 신청과 검토 상태를 확인합니다."
      />
      {applications.isError && (
        <ErrorCard
          message="신청현황 API에 연결할 수 없습니다."
          onRetry={() => applications.refetch()}
          isRetrying={applications.isFetching}
        />
      )}
      {applications.isLoading && (
        <div className="rounded-md border">
          {/* Header row */}
          <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
            {[44, 20, 24, 20, 32].map((w, i) => (
              <Skeleton key={i} className={`h-3.5 w-${w}`} />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b px-4 py-3">
              {[44, 20, 24, 20, 32].map((w, j) => (
                <Skeleton key={j} className={`h-4 w-${w}`} />
              ))}
            </div>
          ))}
        </div>
      )}
      {!applications.isLoading && !applications.isError && (
        <DataTable
          data={applications.data?.data ?? []}
          columns={columns}
        />
      )}

      {/* ── Employment / internship links ── */}
      <div className="mt-10">
        <SectionHeader
          title="채용·연계 이력"
          description="파트너 기업이 귀하의 포트폴리오와 연결한 채용·실습 현황입니다."
        />

        {employmentLinks.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {employmentLinks.isError && (
          <ErrorCard
            message="채용·연계 이력을 불러오지 못했습니다."
            onRetry={() => employmentLinks.refetch()}
            isRetrying={employmentLinks.isFetching}
          />
        )}

        {!employmentLinks.isLoading &&
          !employmentLinks.isError &&
          employmentLinks.data?.data.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                아직 파트너 기업이 귀하의 포트폴리오를 채용·연계 건과 연결하지
                않았습니다.
              </CardContent>
            </Card>
          )}

        {employmentLinks.data && employmentLinks.data.data.length > 0 && (
          <div className="space-y-3">
            {employmentLinks.data.data.map(
              (link: StudentEmploymentLinkResponse) => (
                <Card key={link.id}>
                  <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <p className="font-medium">{link.companyName}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {link.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateRange(link.startsAt, link.endsAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {PARTICIPATION_LABELS[link.participationType] ??
                        link.participationType}
                    </Badge>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
