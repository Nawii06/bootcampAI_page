import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, contractFetch, customFetch } from "@workspace/api-client-react";
import {
  CompanyApplicationsResponseSchema,
  CompanyListResponseSchema,
  type CompanyResponse as Company,
} from "@workspace/api-zod";
import { Link, useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { Button } from "@/components/ui/button";
import { ErrorCard } from "@/components/ErrorCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useFormDraft } from "@/hooks/useFormDraft";

export default function AdminPartners() {
  // Highlight a company row when navigated back from /admin/employment?highlight=...
  const search = useSearch();
  const [highlightId] = useState(
    () => new URLSearchParams(search).get("highlight") ?? undefined,
  );

  // Strip ?highlight= from the URL so a refresh or shared link doesn't re-highlight.
  useEffect(() => {
    if (!highlightId) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("highlight")) return;
    params.delete("highlight");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [highlightId]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyIsActive, setCompanyIsActive] = useState(true);

  const resetCompanyForm = () => {
    setEditingCompanyId("");
    setCompanyName("");
    setCompanyType("");
    setCompanyDescription("");
    setCompanyWebsite("");
    setCompanyIsActive(true);
  };

  // Draft persistence: keeps the editing company ID alongside field values so
  // an expired session doesn't lose the admin's edit context.
  const { clearDraft: clearCompanyDraft } = useFormDraft(
    "admin/partners/company",
    {
      companyName,
      companyType,
      companyDescription,
      companyWebsite,
      companyIsActive,
      editingCompanyId,
    },
    (draft) => {
      if (draft.companyName) setCompanyName(draft.companyName);
      if (draft.companyType) setCompanyType(draft.companyType);
      if (draft.companyDescription) setCompanyDescription(draft.companyDescription);
      if (draft.companyWebsite) setCompanyWebsite(draft.companyWebsite);
      if (typeof draft.companyIsActive === "boolean") setCompanyIsActive(draft.companyIsActive);
      if (draft.editingCompanyId) setEditingCompanyId(draft.editingCompanyId);
    },
    (clear) => {
      toast({
        title: "이전에 작성 중이던 내용을 불러왔습니다",
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              resetCompanyForm();
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );
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
  // Inline validation errors from the API (e.g. invalid website URL),
  // keyed by field name from the VALIDATION_ERROR envelope.
  const companyFieldErrors: Record<string, string> = {};
  if (companyMutation.error instanceof ApiError && companyMutation.error.fieldErrors) {
    for (const fe of companyMutation.error.fieldErrors) {
      if (!(fe.field in companyFieldErrors)) companyFieldErrors[fe.field] = fe.message;
    }
  }
  const saveCompanyEdit = () => {
    if (!editingCompanyId || !companyName.trim() || !companyType.trim()) return;
    companyMutation.reset();
    companyMutation.mutate(
      {
        url: `/api/v1/companies/${editingCompanyId}`,
        method: "PATCH",
        body: {
          name: companyName.trim(),
          companyType: companyType.trim(),
          description: companyDescription.trim() || null,
          website: companyWebsite.trim() || null,
          isActive: companyIsActive,
        },
      },
      {
        onSuccess: () => {
          clearCompanyDraft();
          resetCompanyForm();
        },
      },
    );
  };
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
            onClick={() => {
              companyMutation.reset();
              setEditingCompanyId(row.id);
              setCompanyName(row.name);
              setCompanyType(row.companyType ?? "");
              setCompanyDescription(row.description ?? "");
              setCompanyWebsite(row.website ?? "");
              setCompanyIsActive(row.isActive);
            }}
          >
            수정
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={companyMutation.isPending}
            onClick={() => {
              companyMutation.reset();
              companyMutation.mutate({
                url: `/api/v1/companies/${row.id}`,
                method: "PATCH",
                body: { isPublic: !row.isPublic },
              });
            }}
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
              companyMutation.reset();
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
              companyMutation.reset();
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
                  companyMutation.reset();
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
              onClick={() => {
                companyMutation.reset();
                companyMutation.mutate({
                  url: `/api/v1/company-experts/${row.companyExperts[0]!.id}/status`,
                  method: "PATCH",
                  body: { isActive: !(row.companyExperts[0]!.isActive ?? true) },
                });
              }}
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
          {applications.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20 rounded-md" />
                      <Skeleton className="h-9 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              ))
            : (applications.data?.data ?? []).map((application) => (
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
      {editingCompanyId && (
        <section className="mb-8 rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-semibold">기업정보 수정</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="기업명"
              />
              {companyFieldErrors["name"] && (
                <p className="text-sm text-destructive">{companyFieldErrors["name"]}</p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                placeholder="기업유형"
              />
              {companyFieldErrors["companyType"] && (
                <p className="text-sm text-destructive">{companyFieldErrors["companyType"]}</p>
              )}
            </div>
            <div className="space-y-1 md:col-span-2">
              <Textarea
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="기업 소개"
                rows={3}
              />
              {companyFieldErrors["description"] && (
                <p className="text-sm text-destructive">{companyFieldErrors["description"]}</p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="웹사이트 (https://...)"
              />
              {companyFieldErrors["website"] && (
                <p className="text-sm text-destructive">{companyFieldErrors["website"]}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="company-is-active"
                checked={companyIsActive}
                onCheckedChange={setCompanyIsActive}
              />
              <Label htmlFor="company-is-active">
                {companyIsActive ? "활성" : "비활성"}
              </Label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              disabled={companyMutation.isPending || !companyName.trim() || !companyType.trim()}
              onClick={saveCompanyEdit}
            >
              저장
            </Button>
            <Button
              variant="outline"
              disabled={companyMutation.isPending}
              onClick={() => {
                companyMutation.reset();
                clearCompanyDraft();
                resetCompanyForm();
              }}
            >
              취소
            </Button>
          </div>
        </section>
      )}
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
      {(applications.isError || decision.isError ||
        (companyMutation.isError && Object.keys(companyFieldErrors).length === 0)) && (
        <p className="mb-4 text-destructive">{(applications.error ?? decision.error ?? companyMutation.error)?.message}</p>
      )}
      <DataTable
        data={companies.data?.data ?? []}
        columns={columns}
        filterKey="name"
        filterPlaceholder="기업명 검색"
        loading={companies.isLoading}
        highlightId={highlightId}
      />
    </PortalLayout>
  );
}
