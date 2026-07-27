/**
 * Admin: Employment Records (Cross-Company)
 *
 * Displays all company participation records grouped by company.
 * COMPANY_STAFF / REVIEWER can search, filter, edit, and delete records
 * to correct data entered by partner managers.
 */
import { useState, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminCompanyParticipationListResponseSchema,
  type AdminCompanyParticipationItem,
  CompanyParticipationUpdateSchema,
  CompanyListResponseSchema,
} from "@workspace/api-zod";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorCard } from "@/components/ErrorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Building2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICIPATION_LABELS: Record<string, string> = {
  EMPLOYMENT: "취업",
  INTERNSHIP: "인턴십",
  FIELD_PRACTICE: "현장실습",
  PROJECT: "프로젝트",
  PROJECT_EVALUATION: "프로젝트 평가",
  DEMAND_SURVEY: "수요조사",
};

const TYPE_COLORS: Record<string, string> = {
  EMPLOYMENT: "bg-green-100 text-green-800",
  INTERNSHIP: "bg-blue-100 text-blue-800",
  FIELD_PRACTICE: "bg-orange-100 text-orange-800",
  PROJECT: "bg-purple-100 text-purple-800",
  PROJECT_EVALUATION: "bg-yellow-100 text-yellow-800",
  DEMAND_SURVEY: "bg-gray-100 text-gray-800",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return iso.slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditState {
  title: string;
  participationType: string;
  participantCount: number;
  employmentCount: number;
  startsAt: string;
  endsAt: string;
}

function itemToEditState(item: AdminCompanyParticipationItem): EditState {
  return {
    title: item.title,
    participationType: item.participationType,
    participantCount: item.participantCount,
    employmentCount: item.employmentCount,
    startsAt: item.startsAt ? item.startsAt.slice(0, 10) : "",
    endsAt: item.endsAt ? item.endsAt.slice(0, 10) : "",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminEmployment() {
  // Pre-filter by company when navigated from /admin/partners?companyId=...
  const search = useSearch();
  const initialCompanyId = new URLSearchParams(search).get("companyId") ?? "";

  const [companySearch, setCompanySearch] = useState("");
  const [companyIdFilter, setCompanyIdFilter] = useState(initialCompanyId);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "company-participations"],
    queryFn: () =>
      contractFetch(
        AdminCompanyParticipationListResponseSchema,
        "/api/v1/company-participations",
        { credentials: "include" },
      ),
  });

  // Companies list — used to resolve the pre-filter chip label even when the
  // filtered company has zero participation records.
  const { data: companiesData } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () =>
      contractFetch(CompanyListResponseSchema, "/api/v1/companies", {
        credentials: "include",
      }),
    enabled: !!companyIdFilter,
  });

  const filterCompanyName = useMemo(() => {
    if (!companyIdFilter) return null;
    return (
      companiesData?.data.find((c) => c.id === companyIdFilter)?.name ??
      data?.data.find((item) => item.companyId === companyIdFilter)
        ?.companyName ??
      null
    );
  }, [companyIdFilter, companiesData, data]);

  // ── Filtering & grouping ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const items = data?.data ?? [];
    return items.filter((item) => {
      const q = companySearch.trim().toLowerCase();
      const matchesCompany =
        !q || item.companyName.toLowerCase().includes(q);
      const matchesCompanyId =
        !companyIdFilter || item.companyId === companyIdFilter;
      const matchesType =
        typeFilter === "ALL" || item.participationType === typeFilter;
      return matchesCompany && matchesCompanyId && matchesType;
    });
  }, [data, companySearch, companyIdFilter, typeFilter]);

  /** Records grouped by companyId, sorted by company name */
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { companyName: string; companyType: string; items: AdminCompanyParticipationItem[] }
    >();
    for (const item of filtered) {
      if (!map.has(item.companyId)) {
        map.set(item.companyId, {
          companyName: item.companyName,
          companyType: item.companyType,
          items: [],
        });
      }
      map.get(item.companyId)!.items.push(item);
    }
    return [...map.entries()].sort(([, a], [, b]) =>
      a.companyName.localeCompare(b.companyName, "ko"),
    );
  }, [filtered]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Record<string, unknown>;
    }) =>
      customFetch(`/api/v1/company-participations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        responseType: "json",
        credentials: "include",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "company-participations"] });
      setEditingId(null);
      setEditState(null);
      toast({ title: "수정 완료", description: "채용연계 정보가 수정되었습니다." });
    },
    onError: () => {
      toast({ title: "수정 실패", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      customFetch(`/api/v1/company-participations/${id}`, {
        method: "DELETE",
        responseType: "json",
        credentials: "include",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "company-participations"] });
      setDeletingId(null);
      toast({ title: "삭제 완료", description: "채용연계 건이 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  function startEdit(item: AdminCompanyParticipationItem) {
    setEditingId(item.id);
    setEditState(itemToEditState(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function submitEdit(id: string) {
    if (!editState) return;
    const payload: Record<string, unknown> = {
      title: editState.title,
      participationType: editState.participationType,
      participantCount: editState.participantCount,
      employmentCount: editState.employmentCount,
    };
    if (editState.startsAt) payload.startsAt = new Date(editState.startsAt).toISOString();
    else payload.startsAt = null;
    if (editState.endsAt) payload.endsAt = new Date(editState.endsAt).toISOString();
    else payload.endsAt = null;

    // Validate with Zod before sending
    const result = CompanyParticipationUpdateSchema.safeParse(payload);
    if (!result.success) {
      toast({ title: "입력값 오류", description: result.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id, input: result.data });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalCount = data?.data.length ?? 0;
  const filteredCount = filtered.length;

  return (
    <PortalLayout>
      <SectionHeader
        title="채용연계 현황 (전체 기업)"
        description="모든 참여기업의 채용연계 기록을 조회·수정·삭제할 수 있습니다."
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          className="w-64"
          placeholder="기업명 검색…"
          value={companySearch}
          onChange={(e) => setCompanySearch(e.target.value)}
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="유형 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 유형</SelectItem>
            {Object.entries(PARTICIPATION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Company ID pre-filter chip — set when navigated from /admin/partners */}
        {companyIdFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium self-center">
            {filterCompanyName ?? "기업 필터 적용 중"}
            <button
              type="button"
              aria-label="기업 필터 해제"
              className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
              onClick={() => setCompanyIdFilter("")}
            >
              ✕
            </button>
          </span>
        )}
        <span className="text-sm text-muted-foreground self-center">
          {filteredCount} / {totalCount}건
        </span>
      </div>

      {/* ── Status ── */}
      {isLoading && (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, groupIdx) => (
            <Card key={groupIdx}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, rowIdx) => (
                    <div
                      key={rowIdx}
                      className="flex items-start gap-3 rounded-md border px-4 py-3"
                    >
                      <Skeleton className="mt-0.5 h-5 w-14 shrink-0 rounded" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {isError && <ErrorCard message={error instanceof Error ? error.message : undefined} />}

      {/* ── Empty state ── */}
      {!isLoading && !isError && groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            조건에 맞는 채용연계 건이 없습니다.
          </CardContent>
        </Card>
      )}

      {/* ── Company groups ── */}
      <div className="space-y-6">
        {groups.map(([companyId, group]) => (
          <Card key={companyId}>
            {/* Company header */}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <CardTitle className="text-base">{group.companyName}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {group.companyType}
                </Badge>
                <Link
                  href={`/admin/partners?highlight=${companyId}`}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  기업 관리
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id}>
                    {/* ── Normal row ── */}
                    {editingId !== item.id && (
                      <div className="flex items-start gap-3 rounded-md border px-4 py-3 text-sm">
                        {/* Type badge */}
                        <span
                          className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                            TYPE_COLORS[item.participationType] ??
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {PARTICIPATION_LABELS[item.participationType] ??
                            item.participationType}
                        </span>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(item.startsAt)} ~ {fmtDate(item.endsAt)}
                            {" · "}참여 {item.participantCount}명
                            {" · "}취업 {item.employmentCount}명
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(item)}
                            disabled={deletingId === item.id && deleteMutation.isPending}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deleteMutation.isPending && deletingId === item.id}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `"${item.title}" 채용연계 건을 삭제하시겠습니까?`,
                                )
                              ) {
                                setDeletingId(item.id);
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── Edit form ── */}
                    {editingId === item.id && editState && (
                      <div className="rounded-md border border-primary/30 bg-muted/30 px-4 py-4 space-y-4">
                        <p className="text-sm font-medium">채용연계 정보 수정</p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Type */}
                          <div className="space-y-1">
                            <Label className="text-xs">유형</Label>
                            <Select
                              value={editState.participationType}
                              onValueChange={(v) =>
                                setEditState((s) =>
                                  s ? { ...s, participationType: v } : s,
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PARTICIPATION_LABELS).map(
                                  ([val, label]) => (
                                    <SelectItem key={val} value={val}>
                                      {label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Title */}
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs">제목</Label>
                            <Input
                              className="h-8 text-sm"
                              value={editState.title}
                              onChange={(e) =>
                                setEditState((s) =>
                                  s ? { ...s, title: e.target.value } : s,
                                )
                              }
                            />
                          </div>

                          {/* Participant count */}
                          <div className="space-y-1">
                            <Label className="text-xs">참여 인원</Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-sm"
                              value={editState.participantCount}
                              onChange={(e) =>
                                setEditState((s) =>
                                  s
                                    ? {
                                        ...s,
                                        participantCount:
                                          Number(e.target.value) || 0,
                                      }
                                    : s,
                                )
                              }
                            />
                          </div>

                          {/* Employment count */}
                          <div className="space-y-1">
                            <Label className="text-xs">취업 인원</Label>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-sm"
                              value={editState.employmentCount}
                              onChange={(e) =>
                                setEditState((s) =>
                                  s
                                    ? {
                                        ...s,
                                        employmentCount:
                                          Number(e.target.value) || 0,
                                      }
                                    : s,
                                )
                              }
                            />
                          </div>

                          {/* Start date */}
                          <div className="space-y-1">
                            <Label className="text-xs">시작일</Label>
                            <Input
                              type="date"
                              className="h-8 text-sm"
                              value={editState.startsAt}
                              onChange={(e) =>
                                setEditState((s) =>
                                  s ? { ...s, startsAt: e.target.value } : s,
                                )
                              }
                            />
                          </div>

                          {/* End date */}
                          <div className="space-y-1">
                            <Label className="text-xs">종료일</Label>
                            <Input
                              type="date"
                              className="h-8 text-sm"
                              value={editState.endsAt}
                              onChange={(e) =>
                                setEditState((s) =>
                                  s ? { ...s, endsAt: e.target.value } : s,
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={updateMutation.isPending}
                          >
                            취소
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => submitEdit(item.id)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? "저장 중…" : "저장"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
}
