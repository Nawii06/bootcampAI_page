import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import type { ApplicationStatus } from "../../types";

interface ApplicationRow {
  id: string;
  programName: string;
  sessionName: string;
  status: string;
  submittedAt?: string;
  reviewNote?: string;
}

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
      customFetch<{ data: ApplicationRow[] }>(
        `/api/v1/program-applications?studentId=${encodeURIComponent(user!.id)}`,
        { responseType: "json", credentials: "include" },
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
      {applications.isError ? (
        <p className="text-sm text-destructive">신청현황 API에 연결할 수 없습니다.</p>
      ) : (
        <DataTable data={applications.data?.data ?? []} columns={columns} />
      )}
    </PortalLayout>
  );
}
