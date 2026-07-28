import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, contractFetch, customFetch } from "@workspace/api-client-react";
import {
  CompanyApplicationsResponseSchema,
  CompanyListResponseSchema,
  type CompanyResponse as Company,
} from "@workspace/api-zod";
import { Link } from "wouter";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useHighlightParam } from "@/hooks/useHighlightParam";

export default function AdminPartners() {
  // Highlight a company row when navigated back from /admin/employment?highlight=...
  const highlightId = useHighlightParam();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyIsActive, setCompanyIsActive] = useState(true);

  // Dialog state for quick actions (담당자 추가 / 전문가 추가 / 담당자 보관).
  const [contactDialogCompany, setContactDialogCompany] = useState<Company | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactErrors, setContactErrors] = useState<{ name?: string; email?: string }>({});
  const [expertDialogCompany, setExpertDialogCompany] = useState<Company | null>(null);
  const [expertName, setExpertName] = useState("");
  const [expertSpecialty, setExpertSpecialty] = useState("");
  const [expertErrors, setExpertErrors] = useState<{ name?: string; specialty?: string }>({});
  // 담당자 보관: which company's contacts we're choosing from + the chosen contact.
  const [archiveContactCompany, setArchiveContactCompany] = useState<Company | null>(null);
  const [archiveContactId, setArchiveContactId] = useState("");
  // 전문가 활성/비활성: which company's experts we're choosing from + the chosen expert.
  const [toggleExpertCompany, setToggleExpertCompany] = useState<Company | null>(null);
  const [toggleExpertId, setToggleExpertId] = useState("");

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const submitContact = () => {
    if (!contactDialogCompany) return;
    const name = contactName.trim();
    const email = contactEmail.trim();
    const errors: { name?: string; email?: string } = {};
    if (!name) errors.name = "담당자 이름을 입력해 주세요.";
    if (!email) errors.email = "이메일을 입력해 주세요.";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "올바른 이메일 형식이 아닙니다.";
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) return;
    companyMutation.reset();
    companyMutation.mutate(
      {
        url: `/api/v1/companies/${contactDialogCompany.id}/contacts`,
        body: {
          name,
          email,
          isPrimary: contactDialogCompany.companyContacts.length === 0,
        },
      },
      { onSuccess: () => setContactDialogCompany(null) },
    );
  };
  const submitExpert = () => {
    if (!expertDialogCompany) return;
    const name = expertName.trim();
    const specialty = expertSpecialty.trim();
    const errors: { name?: string; specialty?: string } = {};
    if (!name) errors.name = "전문가 이름을 입력해 주세요.";
    if (!specialty) errors.specialty = "전문 분야를 입력해 주세요.";
    setExpertErrors(errors);
    if (Object.keys(errors).length > 0) return;
    companyMutation.reset();
    companyMutation.mutate(
      {
        url: `/api/v1/companies/${expertDialogCompany.id}/experts`,
        body: { name, specialty, profile: {} },
      },
      { onSuccess: () => setExpertDialogCompany(null) },
    );
  };
  const selectedArchiveContact =
    archiveContactCompany?.companyContacts.find((c) => c.id === archiveContactId) ?? null;
  const confirmArchiveContact = () => {
    if (!selectedArchiveContact) return;
    companyMutation.reset();
    companyMutation.mutate({
      url: `/api/v1/company-contacts/${selectedArchiveContact.id}`,
      method: "DELETE",
    });
    setArchiveContactCompany(null);
    setArchiveContactId("");
  };
  const selectedToggleExpert =
    toggleExpertCompany?.companyExperts.find((e) => e.id === toggleExpertId) ?? null;
  const confirmToggleExpert = () => {
    if (!selectedToggleExpert) return;
    companyMutation.reset();
    companyMutation.mutate({
      url: `/api/v1/company-experts/${selectedToggleExpert.id}/status`,
      method: "PATCH",
      body: { isActive: !(selectedToggleExpert.isActive ?? true) },
    });
    setToggleExpertCompany(null);
    setToggleExpertId("");
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
              companyMutation.reset();
              setContactName("");
              setContactEmail("");
              setContactErrors({});
              setContactDialogCompany(row);
            }}
          >
            담당자 추가
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={companyMutation.isPending}
            onClick={() => {
              companyMutation.reset();
              setExpertName("");
              setExpertSpecialty("");
              setExpertErrors({});
              setExpertDialogCompany(row);
            }}
          >
            전문가 추가
          </Button>
          {row.companyContacts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={companyMutation.isPending}
              onClick={() => {
                setArchiveContactId(row.companyContacts[0]!.id);
                setArchiveContactCompany(row);
              }}
            >
              담당자 보관
            </Button>
          )}
          {row.companyExperts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={companyMutation.isPending}
              onClick={() => {
                setToggleExpertId(row.companyExperts[0]!.id);
                setToggleExpertCompany(row);
              }}
            >
              전문가 활성 관리
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
        highlightMissingMessage="해당 기업을 찾을 수 없습니다."
      />
      <Dialog
        open={contactDialogCompany !== null}
        onOpenChange={(open) => {
          if (!open) setContactDialogCompany(null);
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitContact();
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>담당자 추가</DialogTitle>
              <DialogDescription>
                {contactDialogCompany?.name} 기업의 담당자를 추가합니다.
                {contactDialogCompany?.companyContacts.length === 0 &&
                  " 첫 담당자는 대표 담당자로 지정됩니다."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="contact-name">이름</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="담당자 이름"
              />
              {contactErrors.name && (
                <p className="text-sm text-destructive">{contactErrors.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact-email">이메일</Label>
              <Input
                id="contact-email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@example.com"
              />
              {contactErrors.email && (
                <p className="text-sm text-destructive">{contactErrors.email}</p>
              )}
            </div>
            {contactDialogCompany !== null && companyMutation.isError && (
              <p className="text-sm text-destructive">{companyMutation.error?.message}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={companyMutation.isPending}
                onClick={() => setContactDialogCompany(null)}
              >
                취소
              </Button>
              <Button type="submit" disabled={companyMutation.isPending}>
                추가
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={expertDialogCompany !== null}
        onOpenChange={(open) => {
          if (!open) setExpertDialogCompany(null);
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitExpert();
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>전문가 추가</DialogTitle>
              <DialogDescription>
                {expertDialogCompany?.name} 기업의 전문가를 추가합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="expert-name">이름</Label>
              <Input
                id="expert-name"
                value={expertName}
                onChange={(e) => setExpertName(e.target.value)}
                placeholder="전문가 이름"
              />
              {expertErrors.name && (
                <p className="text-sm text-destructive">{expertErrors.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="expert-specialty">전문 분야</Label>
              <Input
                id="expert-specialty"
                value={expertSpecialty}
                onChange={(e) => setExpertSpecialty(e.target.value)}
                placeholder="예: 클라우드 아키텍처"
              />
              {expertErrors.specialty && (
                <p className="text-sm text-destructive">{expertErrors.specialty}</p>
              )}
            </div>
            {expertDialogCompany !== null && companyMutation.isError && (
              <p className="text-sm text-destructive">{companyMutation.error?.message}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={companyMutation.isPending}
                onClick={() => setExpertDialogCompany(null)}
              >
                취소
              </Button>
              <Button type="submit" disabled={companyMutation.isPending}>
                추가
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={archiveContactCompany !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveContactCompany(null);
            setArchiveContactId("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>담당자 보관</AlertDialogTitle>
            <AlertDialogDescription>
              {(archiveContactCompany?.companyContacts.length ?? 0) > 1
                ? `${archiveContactCompany?.name} 기업의 보관할 담당자를 선택해 주세요.`
                : `${selectedArchiveContact?.name} 담당자를 보관 처리하시겠습니까?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(archiveContactCompany?.companyContacts.length ?? 0) > 1 && (
            <div className="grid gap-2" role="radiogroup" aria-label="보관할 담당자 선택">
              {archiveContactCompany!.companyContacts.map((contact) => (
                <label
                  key={contact.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="archive-contact"
                    value={contact.id}
                    checked={archiveContactId === contact.id}
                    onChange={() => setArchiveContactId(contact.id)}
                  />
                  <span>
                    {contact.name}
                    {contact.email ? ` · ${contact.email}` : ""}
                    {contact.isPrimary ? " (대표)" : ""}
                  </span>
                </label>
              ))}
              {selectedArchiveContact && (
                <p className="text-sm text-muted-foreground">
                  {selectedArchiveContact.name} 담당자를 보관 처리합니다.
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedArchiveContact}
              onClick={confirmArchiveContact}
            >
              보관
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={toggleExpertCompany !== null}
        onOpenChange={(open) => {
          if (!open) {
            setToggleExpertCompany(null);
            setToggleExpertId("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전문가 활성 관리</AlertDialogTitle>
            <AlertDialogDescription>
              {(toggleExpertCompany?.companyExperts.length ?? 0) > 1
                ? `${toggleExpertCompany?.name} 기업의 상태를 변경할 전문가를 선택해 주세요.`
                : `${selectedToggleExpert?.name} 전문가를 ${
                    (selectedToggleExpert?.isActive ?? true) ? "비활성" : "활성"
                  } 처리하시겠습니까?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(toggleExpertCompany?.companyExperts.length ?? 0) > 1 && (
            <div className="grid gap-2" role="radiogroup" aria-label="상태를 변경할 전문가 선택">
              {toggleExpertCompany!.companyExperts.map((expert) => (
                <label
                  key={expert.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="toggle-expert"
                    value={expert.id}
                    checked={toggleExpertId === expert.id}
                    onChange={() => setToggleExpertId(expert.id)}
                  />
                  <span className="flex items-center gap-2">
                    {expert.name}
                    <Badge variant={(expert.isActive ?? true) ? "default" : "outline"}>
                      {(expert.isActive ?? true) ? "활성" : "비활성"}
                    </Badge>
                  </span>
                </label>
              ))}
              {selectedToggleExpert && (
                <p className="text-sm text-muted-foreground">
                  {selectedToggleExpert.name} 전문가를{" "}
                  {(selectedToggleExpert.isActive ?? true) ? "비활성" : "활성"} 처리합니다.
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedToggleExpert}
              onClick={confirmToggleExpert}
            >
              {(selectedToggleExpert?.isActive ?? true) ? "비활성 처리" : "활성 처리"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
}
