import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  ProgramApplicationsResponseSchema,
  type ProgramApplicationResponse as ApplicationRow,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import type { ApplicationStatus } from "../../types";
import { ErrorCard } from "@/components/ErrorCard";

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
  const columns: ColumnDef<ApplicationRow>[] = [
    { key: "programName", header: "프로그램", cell: (row) => <span className="font-medium">{row.programName}</span> },
    { key: "sessionName", header: "회차" },
    {
      key: "submittedAt",
      header: "신청일",
      cell: (row) => row.submittedAt ? new Intl.DateTimeFormat("ko-KR").format(new Date(row.submittedAt)) : "-",
    },
    { key: "status", header: "상태", cell: (row) => <StatusBadge status={displayStatus(row.status)} /> },
    { key: "reviewNote", header: "검토 의견", cell: (row) => row.reviewNote || "-" },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="신청현황" description="프로그램 신청과 검토 상태를 확인합니다." />
      {applications.isError && (
        <ErrorCard
          message="신청현황 API에 연결할 수 없습니다."
          onRetry={() => applications.refetch()}
          isRetrying={applications.isFetching}
        />
      )}
      {!applications.isError && <DataTable data={applications.data?.data ?? []} columns={columns} />}
    </PortalLayout>
  );
}
