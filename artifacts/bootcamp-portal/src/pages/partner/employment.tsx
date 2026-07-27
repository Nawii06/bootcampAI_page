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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function PartnerEmployment() {
  const queryClient = useQueryClient();

  // Form state
  const [participationType, setParticipationType] =
    useState<ParticipationType>("EMPLOYMENT");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [employmentCount, setEmploymentCount] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

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
      queryClient.invalidateQueries({
        queryKey: ["partner", "company-participations"],
      });
      setTitle("");
      setSkills("");
      setParticipantCount(0);
      setEmploymentCount(0);
      setStartsAt("");
      setEndsAt("");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (yearId && title.trim()) createParticipation.mutate();
  }

  // years.isLoading must propagate — if years fails, participation queries never run
  const isLoading =
    years.isLoading ||
    (Boolean(yearId) &&
      (employment.isLoading ||
        internship.isLoading ||
        fieldPractice.isLoading));

  // Treat years failure as a top-level error: without a business year, the page
  // cannot render meaningful data, so showing a false empty state is misleading.
  const isError =
    years.isError ||
    employment.isError ||
    internship.isError ||
    fieldPractice.isError;

  // years succeeded but returned no active business year
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

  const canSubmit =
    Boolean(yearId) && title.trim().length > 0 && !createParticipation.isPending;

  return (
    <PortalLayout>
      <SectionHeader
        title="채용연계 현황"
        description="귀사와 연계되어 채용되거나 실습에 참여한 학생 현황입니다."
      />

      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        {/* Registration form */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-5 text-sm font-semibold">신규 고용 건 등록</h2>
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
                {createParticipation.isPending ? "등록 중…" : "등록"}
              </Button>

              {createParticipation.isError && (
                <p className="text-sm text-destructive">
                  {createParticipation.error instanceof Error
                    ? createParticipation.error.message
                    : "등록 중 오류가 발생했습니다."}
                </p>
              )}

              {createParticipation.isSuccess && (
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
              onRetry={() => { years.refetch(); employment.refetch(); internship.refetch(); fieldPractice.refetch(); }}
              isRetrying={years.isFetching || employment.isFetching || internship.isFetching || fieldPractice.isFetching}
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
              {allRecords.map((record) => (
                <Card key={`${record._type}-${record.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-medium">{record.title}</h2>
                        {record.details.requiredSkills &&
                          record.details.requiredSkills.length > 0 && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              필요 기술:{" "}
                              {record.details.requiredSkills.join(", ")}
                            </p>
                          )}
                      </div>
                      <Badge variant="secondary">
                        {PARTICIPATION_LABELS[record._type] ?? record._type}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      등록일:{" "}
                      {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
