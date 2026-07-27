import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  CompanyApplicationsResponseSchema,
  CompanyListResponseSchema,
  type CompanyResponse as Company,
} from "@workspace/api-zod";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { Button } from "@/components/ui/button";
import { ErrorCard } from "@/components/ErrorCard";

export default function AdminPartners() {
  const queryClient = useQueryClient();
  const companies = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () =>
      contractFetch(CompanyListResponseSchema, "/api/v1/companies", {
        credentials: "include",
      }),
  });
  const applications = useQuery({
    queryKey: ["admin", "company-applications"],
    queryFn: () => contractFetch(
      CompanyApplicationsResponseSchema,
      "/api/v1/company-applications",
      { credentials: "include" },
    ),
  });
  const decision = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note?: string }) =>
      customFetch(`/api/v1/company-applications/${id}/decision`, {
        method: "POST", responseType: "json", credentials: "include",
        body: JSON.stringify({ decision, note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "company-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
    },
  });
  const companyMutation = useMutation({
    mutationFn: ({ url, method = "POST", body }: { url: string; method?: string; body?: unknown }) =>
      customFetch(url, {
        method, responseType: "json", credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "companies"] }),
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
      header: "채용연계",
      cell: (row) => (
        <Link
          href={`/admin/employment?companyId=${row.id}`}
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted"
        >
          {row.companyParticipations.length}건
        </Link>
      ),
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
    {
      key: "actions",
      header: "관리",
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={companyMutation.isPending}
            onClick={() => companyMutation.mutate({
              url: `/api/v1/companies/${row.id}`,
              method: "PATCH",
              body: { isPublic: !row.isPublic },
            })}
          >
            {row.isPublic ? "공개 해제" : "공개"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={companyMutation.isPending}
            onClick={() => {
              const name = window.prompt("추가할 담당자 이름을 입력하세요.");
              const email = name ? window.prompt("담당자 이메일을 입력하세요.") : null;
              if (!name || !email) return;
              companyMutation.mutate({
                url: `/api/v1/companies/${row.id}/contacts`,
                body: { name, email, isPrimary: row.companyContacts.length === 0 },
              });
            }}
          >
            담당자 추가
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={companyMutation.isPending}
            onClick={() => {
              const name = window.prompt("추가할 전문가 이름을 입력하세요.");
              const specialty = name ? window.prompt("전문 분야를 입력하세요.") : null;
              if (!name || !specialty) return;
              companyMutation.mutate({
                url: `/api/v1/companies/${row.id}/experts`,
                body: { name, specialty, profile: {} },
              });
            }}
          >
            전문가 추가
          </Button>
          {row.companyContacts[0] && (
            <Button
              size="sm"
              variant="outline"
              disabled={companyMutation.isPending}
              onClick={() => {
                if (window.confirm(`${row.companyContacts[0]!.name} 담당자를 보관 처리하시겠습니까?`)) {
                  companyMutation.mutate({
                    url: `/api/v1/company-contacts/${row.companyContacts[0]!.id}`,
                    method: "DELETE",
                  });
                }
              }}
            >
              담당자 보관
            </Button>
          )}
          {row.companyExperts[0] && (
            <Button
              size="sm"
              variant="outline"
              disabled={companyMutation.isPending}
              onClick={() => companyMutation.mutate({
                url: `/api/v1/company-experts/${row.companyExperts[0]!.id}/status`,
                method: "PATCH",
                body: { isActive: !(row.companyExperts[0]!.isActive ?? true) },
              })}
            >
              {(row.companyExperts[0]!.isActive ?? true) ? "전문가 비활성" : "전문가 활성"}
            </Button>
          )}
        </div>
      ),
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader
        title="참여기업 관리"
        description="기업신청 검토와 보완요청·승인 후 담당자, 확약 및 참여실적을 관리합니다."
      />
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">기업 신청 검토</h2>
        <div className="space-y-3">
          {(applications.data?.data ?? []).map((application) => (
            <div key={application.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{application.companyName}</p>
                  <p className="text-sm text-muted-foreground">{application.status}</p>
                </div>
                {["SUBMITTED", "REVIEWING", "SUPPLEMENT_REQUESTED"].includes(application.status) && (
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({
                      id: application.id, decision: "SUPPLEMENT_REQUESTED",
                      note: "참여확약서 유효기간과 프로그램별 수용인원을 보완해 주세요.",
                    })}>보완요청</Button>
                    <Button disabled={decision.isPending} onClick={() => decision.mutate({
                      id: application.id, decision: "APPROVED", note: "참여기업 승인",
                    })}>승인</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">승인 참여기업</h2>
        <span className="text-sm text-muted-foreground">확약서 {applications.data?.commitments.length ?? 0}건</span>
      </div>
      {companies.isError && (
        <ErrorCard
          message="참여기업 정보를 불러오지 못했습니다."
          onRetry={() => companies.refetch()}
          isRetrying={companies.isFetching}
        />
      )}
      {(applications.isError || decision.isError || companyMutation.isError) && (
        <p className="mb-4 text-destructive">{(applications.error ?? decision.error ?? companyMutation.error)?.message}</p>
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
