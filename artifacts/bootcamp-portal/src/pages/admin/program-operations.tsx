import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  ProgramListResponseSchema,
  ProgramOperationsResponseSchema,
  type ProgramOperationsResponse as Operations,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useFormDraft } from "@/hooks/useFormDraft";

const api = <T,>(url: string, options?: RequestInit) =>
  customFetch<T>(url, { responseType: "json", credentials: "include", ...options });

export default function AdminProgramOperations() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  // Draft persistence: keeps the session/participant editing context alongside
  // the title field so an expired session doesn't lose the admin's context.
  const { clearDraft } = useFormDraft(
    "admin/program-operations/session",
    { sessionId, participantId, title },
    (draft) => {
      if (draft.sessionId) setSessionId(draft.sessionId);
      if (draft.participantId) setParticipantId(draft.participantId);
      if (draft.title) setTitle(draft.title);
    },
    (clear) => {
      toast({
        title: "이전에 작업 중이던 운영 컨텍스트를 불러왔습니다",
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              setSessionId("");
              setParticipantId("");
              setTitle("");
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );
  const programs = useQuery({
    queryKey: ["admin", "programs", "operations"],
    queryFn: () => contractFetch(
      ProgramListResponseSchema,
      "/api/v1/programs",
      { credentials: "include" },
    ),
  });
  const sessions = (programs.data?.data ?? []).flatMap((program) =>
    (program.programSessions ?? []).map((session) => ({
      ...session,
      label: `${program.name} · ${session.name}`,
    })),
  );
  useEffect(() => {
    if (!sessionId && sessions[0]) setSessionId(sessions[0].id);
  }, [sessionId, sessions]);
  const operations = useQuery({
    queryKey: ["admin", "program-operations", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => contractFetch(
      ProgramOperationsResponseSchema,
      `/api/v1/program-operations?sessionId=${sessionId}`,
      { credentials: "include" },
    ) as Promise<Operations>,
  });
  useEffect(() => {
    const selected = operations.data?.participants.find((row) => row.status === "SELECTED");
    if (selected && !participantId) setParticipantId(selected.studentId);
  }, [operations.data, participantId]);
  const mutate = useMutation({
    mutationFn: ({ url, method = "POST", body }: { url: string; method?: string; body: unknown }) =>
      api(url, { method, body: JSON.stringify(body) }),
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["admin", "program-operations", sessionId] });
    },
  });
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const createEvent = () => mutate.mutate({
    url: "/api/v1/attendance-events",
    body: { sessionId, sequence: (operations.data?.attendanceEvents.length ?? 0) + 1, title: title || "교육 출석", startsAt: now.toISOString(), endsAt: later.toISOString() },
  });
  const createAssignment = () => mutate.mutate({
    url: "/api/v1/assignments",
    body: { sessionId, title: title || "프로젝트 과제", maxScore: 100 },
  });
  const createSurvey = () => mutate.mutate({
    url: "/api/v1/surveys",
    body: { sessionId, title: title || "교육 만족도", schema: { score: { type: "number", min: 1, max: 5 } }, isAnonymous: false },
  });
  const recordAttendance = () => mutate.mutate({
    url: "/api/v1/attendance-records/bulk", method: "PUT",
    body: { eventId: operations.data!.attendanceEvents[0]!.id, records: [{ studentId: participantId, status: "PRESENT", minutesAttended: 60 }] },
  });
  const confirmCompletion = () => mutate.mutate({
    url: "/api/v1/program-completions/confirm",
    body: { sessionId, studentId: participantId },
  });

  return (
    <PortalLayout>
      <SectionHeader title="프로그램 운영" description="회차별 신청자, 출석, 과제, 만족도와 이수확정을 통합 관리합니다." />
      {programs.isLoading ? (
        <LoadingCard message="프로그램 운영 정보를 불러오는 중입니다." />
      ) : (
      <>
      <div className="mb-6 grid gap-3 rounded-lg border bg-card p-5 md:grid-cols-[1fr_1fr_auto]">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sessionId} onChange={(e) => { setSessionId(e.target.value); setParticipantId(""); }}>
          {sessions.map((session) => <option key={session.id} value={session.id}>{session.label}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
          {(operations.data?.participants ?? []).map((row) => <option key={row.id} value={row.studentId}>{row.studentId} · {row.status}</option>)}
        </select>
        <Button disabled={!sessionId} onClick={() => operations.refetch()}>새로고침</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <OperationCard title="신청·선발" count={operations.data?.participants.length ?? 0}>
          {(operations.data?.participants ?? []).map((row) => <p key={row.id} className="text-sm">{row.studentId} <strong className="float-right">{row.status}</strong></p>)}
        </OperationCard>
        <OperationCard title="출석" count={operations.data?.attendanceEvents.length ?? 0}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="회차 또는 업무 제목" />
          <Button variant="outline" className="w-full" disabled={!sessionId || mutate.isPending} onClick={createEvent}>출석회차 생성</Button>
          <Button className="w-full" disabled={!participantId || !operations.data?.attendanceEvents.length || mutate.isPending} onClick={recordAttendance}>선택 학생 출석처리</Button>
        </OperationCard>
        <OperationCard title="과제" count={operations.data?.assignments.length ?? 0}>
          {(operations.data?.assignments ?? []).map((row) => <p key={row.id} className="text-sm">{row.title}</p>)}
          <p className="text-sm text-muted-foreground">제출물 {operations.data?.submissions.length ?? 0}건</p>
          <Button className="w-full" disabled={!sessionId || mutate.isPending} onClick={createAssignment}>과제 생성</Button>
          <Button variant="outline" className="w-full" disabled={!operations.data?.submissions.length || mutate.isPending} onClick={() => mutate.mutate({ url: "/api/v1/assignment-submissions/grade", body: { submissionId: operations.data!.submissions[0]!.id, score: 90, feedback: "운영자 확인 완료" } })}>첫 제출물 90점 채점</Button>
        </OperationCard>
        <OperationCard title="만족도" count={operations.data?.surveys.length ?? 0}>
          {(operations.data?.surveys ?? []).map((row) => <p key={row.id} className="text-sm">{row.title}</p>)}
          <Button className="w-full" disabled={!sessionId || mutate.isPending} onClick={createSurvey}>만족도 설문 생성</Button>
          <p className="text-sm text-muted-foreground">응답 {operations.data?.surveyResponses.length ?? 0}건</p>
        </OperationCard>
        <OperationCard title="이수확정" count={operations.data?.completions.length ?? 0}>
          {(operations.data?.completions ?? []).map((row) => <p key={row.id} className="text-sm">{row.studentId} <strong className="float-right">{row.completed ? "이수" : "미이수"}</strong></p>)}
          <Button className="w-full" disabled={!participantId || mutate.isPending} onClick={confirmCompletion}>선택 학생 이수 계산·확정</Button>
        </OperationCard>
      </div>
            {programs.isError && (
        <ErrorCard
          message="프로그램 목록을 불러오지 못했습니다."
          onRetry={() => programs.refetch()}
          isRetrying={programs.isFetching}
        />
      )}
            {operations.isError && (
        <ErrorCard
          message={operations.error?.message}
          onRetry={() => operations.refetch()}
          isRetrying={operations.isFetching}
        />
      )}
      {mutate.isError && <p className="mt-4 text-sm text-destructive">{mutate.error?.message}</p>}
      </>
      )}
    </PortalLayout>
  );
}

function OperationCard({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return <section className="space-y-3 rounded-lg border bg-card p-5"><h3 className="font-semibold">{title}<span className="float-right rounded-full bg-muted px-2 py-0.5 text-xs">{count}</span></h3>{children}</section>;
}
