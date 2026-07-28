import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  ProgramApplicationsResponseSchema,
  ProgramLearningResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";

const api = <T,>(url: string, options?: RequestInit) =>
  customFetch<T>(url, { responseType: "json", credentials: "include", ...options });

export default function StudentLearning() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [content, setContent] = useState("");
  const [score, setScore] = useState("5");
  const applications = useQuery({
    queryKey: ["student", "learning-applications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => contractFetch(
      ProgramApplicationsResponseSchema,
      `/api/v1/program-applications?studentId=${user!.id}`,
      { credentials: "include" },
    ),
  });
  const selected = (applications.data?.data ?? []).filter((row) => row.status === "SELECTED");
  useEffect(() => {
    if (!sessionId && selected[0]) setSessionId(selected[0].sessionId);
  }, [selected, sessionId]);
  const learning = useQuery({
    queryKey: ["student", "program-learning", sessionId, user?.id],
    enabled: Boolean(sessionId && user?.id),
    queryFn: () => contractFetch(
      ProgramLearningResponseSchema,
      `/api/v1/program-learning?sessionId=${sessionId}&studentId=${user!.id}`,
      { credentials: "include" },
    ),
  });
  const submit = useMutation({
    mutationFn: ({ url, body, method = "POST" }: { url: string; body: unknown; method?: string }) =>
      api(url, { method, body: JSON.stringify(body) }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["student", "program-learning", sessionId, user?.id] });
    },
  });
  return (
    <PortalLayout>
      <SectionHeader title="과제·만족도" description="선발된 프로그램의 과제를 제출하고 만족도 설문에 응답합니다." />
      {applications.isError && (
        <ErrorCard
          className="mb-6"
          message="신청 프로그램 목록을 불러오지 못했습니다."
          onRetry={() => applications.refetch()}
          isRetrying={applications.isFetching}
        />
      )}
      <select className="mb-6 h-10 w-full rounded-md border bg-background px-3 text-sm" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
        {selected.map((row) => <option key={row.id} value={row.sessionId}>{row.programName} · {row.sessionName}</option>)}
      </select>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">과제</h3>
          <div className="mt-4 space-y-4">
            {(learning.data?.assignments ?? []).map((assignment) => {
              const submission = learning.data?.submissions.find((row) => row.assignmentId === assignment.id);
              return <div key={assignment.id} className="rounded-md border p-4">
                <p className="font-medium">{assignment.title}</p>
                <p className="text-sm text-muted-foreground">{submission ? `제출완료 · 점수 ${submission.score ?? "채점 대기"}` : "미제출"}</p>
                {!submission && <>
                  <textarea className="mt-3 min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={content} onChange={(e) => setContent(e.target.value)} placeholder="과제 내용을 입력하세요." />
                  <Button className="mt-2" disabled={!content.trim() || submit.isPending} onClick={() => submit.mutate({ url: "/api/v1/assignment-submissions", method: "PUT", body: { assignmentId: assignment.id, studentId: user!.id, content } })}>제출</Button>
                </>}
              </div>;
            })}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">만족도 설문</h3>
          <div className="mt-4 space-y-4">
            {(learning.data?.surveys ?? []).map((survey) => {
              const response = learning.data?.surveyResponses.find((row) => row.surveyId === survey.id);
              return <div key={survey.id} className="rounded-md border p-4">
                <p className="font-medium">{survey.title}</p>
                <p className="text-sm text-muted-foreground">{response ? "응답완료" : "응답 대기"}</p>
                {!response && <div className="mt-3 flex gap-2">
                  <Input type="number" min="1" max="5" value={score} onChange={(e) => setScore(e.target.value)} />
                  <Button disabled={submit.isPending} onClick={() => submit.mutate({ url: "/api/v1/survey-responses", body: { surveyId: survey.id, studentId: user!.id, answers: { score: Number(score) } } })}>응답 제출</Button>
                </div>}
              </div>;
            })}
          </div>
        </section>
      </div>
            {learning.isError && (
        <ErrorCard
          message="학습 콘텐츠를 불러오지 못했습니다."
          onRetry={() => learning.refetch()}
          isRetrying={learning.isFetching}
        />
      )}
      {submit.isError && <p className="mt-4 text-sm text-destructive">{submit.error?.message}</p>}
    </PortalLayout>
  );
}
