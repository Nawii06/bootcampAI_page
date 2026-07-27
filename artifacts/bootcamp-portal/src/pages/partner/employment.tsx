import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  CompanyParticipationListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ErrorCard";

const PARTICIPATION_LABELS: Record<string, string> = {
  EMPLOYMENT: "채용 연계",
  INTERNSHIP: "인턴십",
  FIELD_PRACTICE: "현장실습",
};

export default function PartnerEmployment() {
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

  // years.isLoading must propagate — if years fails, participation queries never run
  const isLoading =
    years.isLoading ||
    (Boolean(yearId) &&
      (employment.isLoading || internship.isLoading || fieldPractice.isLoading));

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
    ...(employment.data?.data ?? []).map((item) => ({ ...item, _type: "EMPLOYMENT" as const })),
    ...(internship.data?.data ?? []).map((item) => ({ ...item, _type: "INTERNSHIP" as const })),
    ...(fieldPractice.data?.data ?? []).map((item) => ({
      ...item,
      _type: "FIELD_PRACTICE" as const,
    })),
  ].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  return (
    <PortalLayout>
      <SectionHeader
        title="채용연계 현황"
        description="귀사와 연계되어 채용되거나 실습에 참여한 학생 현황입니다."
      />

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
              학생 포트폴리오를 검토하시고 우수 인재에게 면접 제안을 할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && allRecords.length > 0 && (
        <div className="space-y-3">
          {allRecords.map((record) => (
            <Card key={`${record._type}-${record.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-medium">{record.title}</h2>
                    {record.details.requiredSkills &&
                      record.details.requiredSkills.length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          필요 기술: {record.details.requiredSkills.join(", ")}
                        </p>
                      )}
                  </div>
                  <Badge variant="secondary">
                    {PARTICIPATION_LABELS[record._type] ?? record._type}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  등록일: {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
