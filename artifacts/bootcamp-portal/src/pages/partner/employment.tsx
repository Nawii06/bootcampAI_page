import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  CompanyParticipationListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField } from "../../components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ErrorCard";
import { Pencil, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormDraft } from "@/hooks/useFormDraft";

const PARTICIPATION_LABELS: Record<string, string> = {
  EMPLOYMENT: "채용 연계",
  INTERNSHIP: "인턴십",
  FIELD_PRACTICE: "현장실습",
};

type ParticipationType = "EMPLOYMENT" | "INTERNSHIP" | "FIELD_PRACTICE";

const PARTICIPATION_TYPES: ParticipationType[] = [
  "EMPLOYMENT",
  "INTERNSHIP",
  "FIELD_PRACTICE",
];

/** Convert an ISO timestamp or undefined to a YYYY-MM-DD string for <input type="date"> */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function PartnerEmployment() {
  const queryClient = useQueryClient();

  // ─── Form state (shared between create and edit modes) ──────────────────
  const [participationType, setParticipationType] =
    useState<ParticipationType>("EMPLOYMENT");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [employmentCount, setEmploymentCount] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  // ─── Edit / delete mode ─────────────────────────────────────────────────
  /** ID of the record currently open for editing (null = create mode) */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** ID of the record awaiting delete confirmation */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { clearDraft } = useFormDraft(
    "/partner/employment",
    { participationType, title, skills, participantCount, employmentCount, startsAt, endsAt },
    (draft) => {
      if (draft.participationType) setParticipationType(draft.participationType);
      if (draft.title) setTitle(draft.title);
      if (draft.skills) setSkills(draft.skills);
      if (draft.participantCount) setParticipantCount(draft.participantCount);
      if (draft.employmentCount) setEmploymentCount(draft.employmentCount);
      if (draft.startsAt) setStartsAt(draft.startsAt);
      if (draft.endsAt) setEndsAt(draft.endsAt);
    },
  );

  // ─── Queries ─────────────────────────────────────────────────────────────
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () =>
      contractFetch(
        BusinessYearListResponseSchema,
        "/api/v1/reference/business-years?active=true",
      ),
  });
  const yearId = years.data?.data[0]?.id;

  const employment = useQuery({
    queryKey: ["partner", "company-participations", yearId, "EMPLOYMENT"],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        CompanyParticipationListResponseSchema,
        `/api/v1/company-participations?businessYearId=${yearId}&participationType=EMPLOYMENT`,
        { credentials: "include" },
      ),
  });

  const internship = useQuery({
    queryKey: ["partner", "company-participations", yearId, "INTERNSHIP"],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        CompanyParticipationListResponseSchema,
        `/api/v1/company-participations?businessYearId=${yearId}&participationType=INTERNSHIP`,
        { credentials: "include" },
      ),
  });

  const fieldPractice = useQuery({
    queryKey: ["partner", "company-participations", yearId, "FIELD_PRACTICE"],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        CompanyParticipationListResponseSchema,
        `/api/v1/company-participations?businessYearId=${yearId}&participationType=FIELD_PRACTICE`,
        { credentials: "include" },
      ),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createParticipation = useMutation({
    mutationFn: () =>
      customFetch("/api/v1/company-participations", {
        method: "POST",
        responseType: "json",
        credentials: "include",
        body: JSON.stringify({
          businessYearId: yearId,
          participationType,
          title: title.trim(),
          participantCount,
          employmentCount,
          details: {
            requiredSkills: skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
          ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
          ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
        }),
      }),
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["partner", "company-participations"] });
      setTitle("");
      setSkills("");
      setParticipantCount(0);
      setEmploymentCount(0);
      setStartsAt("");
      setEndsAt("");
    },
  });

  const updateParticipation = useMutation({
    mutationFn: (id: string) =>
      customFetch(`/api/v1/company-participations/${id}`, {
        method: "PATCH",
        responseType: "json",
        credentials: "include",
        body: JSON.stringify({
          participationType,
          title: title.trim(),
          participantCount,
          employmentCount,
          details: {
            requiredSkills: skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner", "company-participations"] });
      handleCancelEdit();
    },
  });

  const deleteParticipation = useMutation({
    mutationFn: (id: string) =>
      customFetch(`/api/v1/company-participations/${id}`, {
        method: "DELETE",
        responseType: "json",
        credentials: "include",
      }),
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["partner", "company-participations"] });
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function handleCancelEdit() {
    setEditingId(null);
    setParticipationType("EMPLOYMENT");
    setTitle("");
    setSkills("");
    setParticipantCount(0);
    setEmploymentCount(0);
    setStartsAt("");
    setEndsAt("");
    clearDraft();
  }

  function handleEditClick(record: typeof allRecords[number]) {
    setDeletingId(null);
    setEditingId(record.id);
    setParticipationType(record._type as ParticipationType);
    setTitle(record.title);
    setSkills((record.details.requiredSkills ?? []).join(", "));
    setParticipantCount(record.participantCount ?? 0);
    setEmploymentCount(record.employmentCount ?? 0);
    setStartsAt(toDateInput(record.startsAt));
    setEndsAt(toDateInput(record.endsAt));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (editingId) {
      updateParticipation.mutate(editingId);
    } else if (yearId) {
      createParticipation.mutate();
    }
  }

  // ─── Derived state ────────────────────────────────────────────────────────
  const isLoading =
    years.isLoading ||
    (Boolean(yearId) &&
      (employment.isLoading || internship.isLoading || fieldPractice.isLoading));

  const isError =
    years.isError || employment.isError || internship.isError || fieldPractice.isError;

  const noActiveYear =
    !years.isLoading && !years.isError && years.data?.data.length === 0;

  const allRecords = [
    ...(employment.data?.data ?? []).map((item) => ({
      ...item,
      _type: "EMPLOYMENT" as const,
    })),
    ...(internship.data?.data ?? []).map((item) => ({
      ...item,
      _type: "INTERNSHIP" as const,
    })),
    ...(fieldPractice.data?.data ?? []).map((item) => ({
      ...item,
      _type: "FIELD_PRACTICE" as const,
    })),
  ].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  const isMutating =
    createParticipation.isPending || updateParticipation.isPending;

  const canSubmit = Boolean(yearId) && title.trim().length > 0 && !isMutating;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PortalLayout>
      <SectionHeader
        title="채용연계 현황"
        description="귀사와 연계되어 채용되거나 실습에 참여한 학생 현황입니다."
      />

      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        {/* Registration / edit form */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-5 text-sm font-semibold">
              {editingId ? "고용 건 수정" : "신규 고용 건 등록"}
            </h2>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <FormField label="유형" required>
                <Select
                  value={participationType}
                  onValueChange={(v) =>
                    setParticipationType(v as ParticipationType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTICIPATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PARTICIPATION_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="제목" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2024년 하반기 채용 연계"
                />
              </FormField>

              <FormField label="필요 기술 (쉼표 구분)">
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Python, ML, 컴퓨터비전"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="참여 인원">
                  <Input
                    type="number"
                    min={0}
                    value={participantCount}
                    onChange={(e) =>
                      setParticipantCount(Number(e.target.value))
                    }
                  />
                </FormField>
                <FormField label="채용 인원">
                  <Input
                    type="number"
                    min={0}
                    value={employmentCount}
                    onChange={(e) =>
                      setEmploymentCount(Number(e.target.value))
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="시작일">
                  <Input
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </FormField>
                <FormField label="종료일">
                  <Input
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </FormField>
              </div>

              <Button className="w-full" disabled={!canSubmit}>
                {updateParticipation.isPending
                  ? "수정 중…"
                  : createParticipation.isPending
                    ? "등록 중…"
                    : editingId
                      ? "수정 완료"
                      : "등록"}
              </Button>

              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCancelEdit}
                >
                  취소
                </Button>
              )}

              {(createParticipation.isError || updateParticipation.isError) && (
                <p className="text-sm text-destructive">
                  {(updateParticipation.error ?? createParticipation.error) instanceof Error
                    ? (updateParticipation.error ?? createParticipation.error)!.message
                    : "처리 중 오류가 발생했습니다."}
                </p>
              )}

              {createParticipation.isSuccess && !editingId && (
                <p className="text-sm text-green-600">등록되었습니다.</p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Records list */}
        <div className="space-y-3">
          {isLoading && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                데이터를 불러오는 중입니다…
              </CardContent>
            </Card>
          )}

          {!isLoading && isError && (
            <ErrorCard
              message="API에 연결할 수 없습니다."
              onRetry={() => {
                years.refetch();
                employment.refetch();
                internship.refetch();
                fieldPractice.refetch();
              }}
              isRetrying={
                years.isFetching ||
                employment.isFetching ||
                internship.isFetching ||
                fieldPractice.isFetching
              }
            />
          )}

          {!isLoading && !isError && noActiveYear && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                현재 운영 중인 사업연도가 없습니다. 관리자에게 문의해 주세요.
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && !noActiveYear && allRecords.length === 0 && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground">
                <div className="text-4xl mb-4 opacity-50">🤝</div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  진행 중인 채용연계 건이 없습니다.
                </h3>
                <p className="max-w-md text-sm">
                  왼쪽 폼에서 신규 고용·인턴십·현장실습 건을 등록하세요.
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && allRecords.length > 0 && (
            <>
              {allRecords.map((record) => {
                const isDeleting = deletingId === record.id;
                const isEditing = editingId === record.id;
                return (
                  <Card
                    key={`${record._type}-${record.id}`}
                    className={isEditing ? "ring-2 ring-primary" : undefined}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="font-medium">{record.title}</h2>
                          {record.details.requiredSkills &&
                            record.details.requiredSkills.length > 0 && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                필요 기술:{" "}
                                {record.details.requiredSkills.join(", ")}
                              </p>
                            )}
                          {(record.participantCount > 0 ||
                            record.employmentCount > 0) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              참여 {record.participantCount}명 · 채용{" "}
                              {record.employmentCount}명
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant="secondary">
                            {PARTICIPATION_LABELS[record._type] ?? record._type}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="수정"
                            onClick={() => handleEditClick(record)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="삭제"
                            onClick={() =>
                              setDeletingId(isDeleting ? null : record.id)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        등록일:{" "}
                        {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                      </p>

                      {/* Inline delete confirmation */}
                      {isDeleting && (
                        <div className="mt-3 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                          <p className="text-sm text-destructive">
                            정말 삭제하시겠습니까?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteParticipation.isPending}
                              onClick={() => deleteParticipation.mutate(record.id)}
                            >
                              {deleteParticipation.isPending
                                ? "삭제 중…"
                                : "삭제 확인"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingId(null)}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      )}

                      {deleteParticipation.isError &&
                        deletingId === record.id && (
                          <p className="mt-2 text-xs text-destructive">
                            {deleteParticipation.error instanceof Error
                              ? deleteParticipation.error.message
                              : "삭제 중 오류가 발생했습니다."}
                          </p>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
