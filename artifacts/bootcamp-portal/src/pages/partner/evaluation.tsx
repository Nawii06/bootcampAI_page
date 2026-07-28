import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  CompanyPortfolioCandidateListResponseSchema,
  type CompanyPortfolioCandidateResponse as Portfolio,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

export default function PartnerEvaluation() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const noOpenPeriod = years.isSuccess && years.data.data.length === 0;
  const portfolios = useQuery({
    queryKey: ["partner", "portfolio-candidates"],
    queryFn: () => contractFetch(
      CompanyPortfolioCandidateListResponseSchema,
      "/api/v1/company-portfolio-candidates",
      { credentials: "include" },
    ),
  });
  const submit = useMutation({
    mutationFn: (portfolio: Portfolio) => customFetch("/api/v1/company-participations", {
      method: "POST",
      responseType: "json",
      credentials: "include",
      body: JSON.stringify({
        businessYearId: yearId,
        participationType: "PROJECT_EVALUATION",
        title: `${portfolio.title} 기업 피드백`,
        details: {
          experientialRecordId: portfolio.id,
          studentId: portfolio.studentId,
          feedback: feedback[portfolio.id],
          submittedAt: new Date().toISOString(),
        },
      }),
    }),
    onSuccess: (_data, portfolio) => {
      queryClient.invalidateQueries({ queryKey: ["partner", "company-participations"] });
      setFeedback((current) => ({ ...current, [portfolio.id]: "" }));
    },
  });
  return (
    <PortalLayout>
      <SectionHeader
        title="학생 프로젝트 평가"
        description="공개에 동의한 학생 프로젝트만 열람하고 기업 피드백을 기록합니다."
      />
      {years.isLoading || portfolios.isLoading ? (
        <LoadingCard message="학생 프로젝트 목록을 불러오는 중입니다." />
      ) : (
        <>
      {noOpenPeriod && (
        <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" role="status">
          현재 진행 중인 평가 기간이 없습니다. 평가 기간이 열리면 피드백을 저장할 수 있습니다.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {(portfolios.data?.data ?? []).map((portfolio) => (
          <Card key={portfolio.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{portfolio.title}</h2>
                <Badge variant="outline">공개 동의</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {portfolio.evidence.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(portfolio.evidence.techStack ?? []).map((tech) => (
                  <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {(portfolio.evidence.outputLinks ?? []).map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-primary hover:underline">{link}</a>
                ))}
              </div>
              <Textarea
                className="mt-5"
                rows={4}
                value={feedback[portfolio.id] ?? ""}
                onChange={(event) => setFeedback((current) => ({ ...current, [portfolio.id]: event.target.value }))}
                placeholder="프로젝트 수행 결과에 대한 기업 피드백"
              />
              <Button
                className="mt-3 w-full"
                disabled={!yearId || !(feedback[portfolio.id] ?? "").trim() || submit.isPending}
                onClick={() => submit.mutate(portfolio)}
              >
                피드백 저장
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!portfolios.isLoading && (portfolios.data?.data.length ?? 0) === 0 && (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          공개에 동의한 학생 프로젝트가 없습니다.
        </div>
      )}
      {portfolios.isError && (
        <ErrorCard
          message="포트폴리오 데이터를 불러오지 못했습니다."
          onRetry={() => portfolios.refetch()}
          isRetrying={portfolios.isFetching}
        />
      )}
      {submit.isError && <p className="mt-4 text-destructive">피드백 저장에 실패했습니다.</p>}
        </>
      )}
    </PortalLayout>
  );
}
