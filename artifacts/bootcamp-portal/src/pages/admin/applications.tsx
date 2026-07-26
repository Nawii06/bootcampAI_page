import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { Button } from "@/components/ui/button";

interface Application {
  id: string;
  programName: string;
  sessionName: string;
  studentId: string;
  status: string;
  submittedAt?: string;
}

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const applications = useQuery({
    queryKey: ["admin", "program-applications"],
    queryFn: () =>
      customFetch<{ data: Application[] }>("/api/v1/program-applications", {
        responseType: "json",
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
      <DataTable data={applications.data?.data ?? []} columns={columns} />
    </PortalLayout>
  );
}
