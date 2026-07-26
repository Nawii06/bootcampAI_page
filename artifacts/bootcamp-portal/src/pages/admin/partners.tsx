import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";

interface Company {
  id: string;
  name: string;
  registrationNumber?: string;
  companyType: string;
  website?: string;
  isPublic: boolean;
  isActive: boolean;
  companyContacts: Array<{ id: string; name: string; email?: string; isPrimary: boolean }>;
  companyExperts: Array<{ id: string }>;
  companyParticipations: Array<{ id: string }>;
}

export default function AdminPartners() {
  const companies = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () =>
      customFetch<{ data: Company[] }>("/api/v1/companies", {
        responseType: "json",
        credentials: "include",
      }),
  });
  const columns: ColumnDef<Company>[] = [
    {
      key: "name",
      header: "기업명",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "companyType", header: "기업유형" },
    { key: "registrationNumber", header: "사업자등록번호" },
    {
      key: "companyContacts",
      header: "대표 담당자",
      cell: (row) => {
        const contact =
          row.companyContacts.find((item) => item.isPrimary) ??
          row.companyContacts[0];
        return contact ? `${contact.name}${contact.email ? ` · ${contact.email}` : ""}` : "-";
      },
    },
    {
      key: "companyExperts",
      header: "전문가",
      cell: (row) => `${row.companyExperts.length}명`,
    },
    {
      key: "companyParticipations",
      header: "참여실적",
      cell: (row) => `${row.companyParticipations.length}건`,
    },
    {
      key: "isActive",
      header: "상태",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "outline"}>
          {row.isActive ? "활성" : "비활성"}
        </Badge>
      ),
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader
        title="참여기업 관리"
        description="승인된 기업의 담당자, 전문가, 프로그램 참여실적을 조회합니다."
      />
      {companies.isError && (
        <p className="mb-4 text-destructive">참여기업 정보를 불러오지 못했습니다.</p>
      )}
      <DataTable
        data={companies.data?.data ?? []}
        columns={columns}
        filterKey="name"
        filterPlaceholder="기업명 검색"
      />
    </PortalLayout>
  );
}
