import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import type { ApplicationStatus } from "../../types";

interface Program {
  id: string;
  code: string;
  name: string;
  programType: string;
  status: string;
  programSessions?: Array<{ id: string }>;
}

function displayStatus(status: string): ApplicationStatus {
  if (status === "APPROVED" || status === "OPEN") return "selected";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "reviewing";
}

export default function AdminPrograms() {
  const programs = useQuery({
    queryKey: ["admin", "programs"],
    queryFn: () =>
      customFetch<{ data: Program[] }>("/api/v1/programs", {
        responseType: "json",
        credentials: "include",
      }),
  });
  const columns: ColumnDef<Program>[] = [
    { key: "code", header: "코드" },
    { key: "name", header: "프로그램명", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "programType", header: "유형" },
    { key: "programSessions", header: "회차", cell: (row) => `${row.programSessions?.length ?? 0}개` },
    { key: "status", header: "상태", cell: (row) => <StatusBadge status={displayStatus(row.status)} /> },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="프로그램 관리" description="DB에 등록된 프로그램과 회차를 조회합니다." />
      {programs.isError ? <p className="text-destructive">프로그램 API에 연결할 수 없습니다.</p> : <DataTable data={programs.data?.data ?? []} columns={columns} />}
    </PortalLayout>
  );
}
