import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  ProgramApplicationsResponseSchema,
  type ProgramApplicationResponse as Application,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { Button } from "@/components/ui/button";

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const applications = useQuery({
    queryKey: ["admin", "program-applications"],
    queryFn: () =>
      contractFetch(ProgramApplicationsResponseSchema, "/api/v1/program-applications", {
        credentials: "include",
      }),
  });
  const decision = useMutation({
    mutationFn: (input: { applicationId: string; status: "SELECTED" | "REJECTED" }) =>
      customFetch("/api/v1/program-applications/decision", {
        method: "POST",
        responseType: "json",
        credentials: "include",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "program-applications"] }),
  });
  const columns: ColumnDef<Application>[] = [
    { key: "programName", header: "프로그램" },
    { key: "sessionName", header: "회차" },
    { key: "studentId", header: "학생 ID" },
    { key: "status", header: "상태" },
    {
      key: "id",
      header: "처리",
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => decision.mutate({ applicationId: row.id, status: "SELECTED" })}>선발</Button>
          <Button size="sm" variant="outline" onClick={() => decision.mutate({ applicationId: row.id, status: "REJECTED" })}>반려</Button>
        </div>
      ),
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="신청·선발 관리" description="신청서를 검토하고 선발 상태를 변경합니다." />
      {decision.isError && <p className="mb-3 text-destructive">{decision.error.message}</p>}
      {applications.isError ? (
        <ErrorCard
          message="신청·선발 목록을 불러오지 못했습니다."
          onRetry={() => applications.refetch()}
          isRetrying={applications.isFetching}
        />
      ) : applications.isLoading ? (
        <LoadingCard message="신청·선발 목록을 불러오는 중입니다." />
      ) : (
        <DataTable
          data={applications.data?.data ?? []}
          columns={columns}
          loading={applications.isLoading}
        />
      )}
    </PortalLayout>
  );
}
