import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  PerformanceReviewListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ErrorCard";

export default function AdminEvaluation() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [limitations, setLimitations] = useState("");
  const [plan, setPlan] = useState("");
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const reviews = useQuery({
    queryKey: ["performance", "reviews", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(
      PerformanceReviewListResponseSchema,
      `/api/v1/performance-reviews?businessYearId=${yearId}`,
      { credentials: "include" },
    ),
  });
  const createReview = useMutation({
    mutationFn: () => customFetch("/api/v1/performance-reviews", {
      method: "POST",
      responseType: "json",
      credentials: "include",
      body: JSON.stringify({
        businessYearId: yearId,
        question,
        answerSummary: answer,
        limitations: limitations || undefined,
        improvementPlan: plan,
        linkedIndicatorIds: [],
        linkedEvidenceIds: [],
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "reviews", yearId] });
      setQuestion(""); setAnswer(""); setLimitations(""); setPlan("");
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (yearId && question.trim() && answer.trim() && plan.trim()) createReview.mutate();
  }
  return (
    <PortalLayout>
      <SectionHeader title="성과 자체평가" description={`${years.data?.data[0]?.name ?? "활성 사업연도"} 평가 문답과 개선계획을 관리합니다.`} />
      {(years.isError || reviews.isError) && (
        <ErrorCard
          message="성과 자체평가 데이터를 불러오지 못했습니다."
          onRetry={() => { years.refetch(); reviews.refetch(); }}
          isRetrying={years.isFetching || reviews.isFetching}
          className="mb-6"
        />
      )}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Input className="md:col-span-2" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="평가 질문" />
            <Textarea rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="답변 요약" />
            <Textarea rows={4} value={limitations} onChange={(event) => setLimitations(event.target.value)} placeholder="한계 및 보완 필요사항" />
            <Textarea className="md:col-span-2" rows={3} value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="개선계획" />
            <Button className="md:col-span-2" disabled={!yearId || !question.trim() || !answer.trim() || !plan.trim() || createReview.isPending}>자체평가 저장</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {(reviews.data?.data ?? []).map((review) => (
          <Card key={review.id}><CardContent className="p-6">
            <div className="flex justify-between gap-4"><h2 className="font-semibold">Q. {review.question}</h2><Badge variant="secondary">{review.status}</Badge></div>
            <p className="mt-4 whitespace-pre-wrap text-sm">A. {review.answerSummary}</p>
            {review.limitations && <p className="mt-3 text-sm text-muted-foreground">한계: {review.limitations}</p>}
            <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm"><strong>개선계획:</strong> {review.improvementPlan}</p>
          </CardContent></Card>
        ))}
      </div>
    </PortalLayout>
  );
}
