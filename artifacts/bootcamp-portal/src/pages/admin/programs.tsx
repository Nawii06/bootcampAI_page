import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  ProgramListResponseSchema,
  type ProgramResponse as Program,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import type { ApplicationStatus } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { useHighlightParam } from "@/hooks/useHighlightParam";

function displayStatus(status: string): ApplicationStatus {
  if (status === "APPROVED" || status === "OPEN") return "selected";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "reviewing";
}

export default function AdminPrograms() {
  // Deep links (e.g. from notifications) can highlight a specific program row.
  const highlightId = useHighlightParam();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Program>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [programType, setProgramType] = useState("");
  const [departmentCodes, setDepartmentCodes] = useState("");
  const [minimumGrade, setMinimumGrade] = useState("");
  const [maximumGrade, setMaximumGrade] = useState("");
  const [attendanceRate, setAttendanceRate] = useState("");
  const [assignmentScore, setAssignmentScore] = useState("");
  const [surveyRequired, setSurveyRequired] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [venue, setVenue] = useState("");
  const [applicationStartsAt, setApplicationStartsAt] = useState("");
  const [applicationEndsAt, setApplicationEndsAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const programs = useQuery({
    queryKey: ["admin", "programs"],
    queryFn: () =>
      contractFetch(ProgramListResponseSchema, "/api/v1/programs", {
        credentials: "include",
      }),
  });
  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description ?? "");
    setProgramType(selected.programType);
    setDepartmentCodes(selected.eligibilityRules.departmentCodes?.join(", ") ?? "");
    setMinimumGrade(String(selected.eligibilityRules.minimumGrade ?? ""));
    setMaximumGrade(String(selected.eligibilityRules.maximumGrade ?? ""));
    setAttendanceRate(String(selected.completionRules.minimumAttendanceRate ?? ""));
    setAssignmentScore(String(selected.completionRules.minimumAssignmentScore ?? ""));
    setSurveyRequired(selected.completionRules.surveyRequired ?? false);
    const session = selected.programSessions[0];
    if (session) {
      setSessionId(session.id); setSessionName(session.name); setCapacity(String(session.capacity));
      setVenue(session.venue ?? "");
      setApplicationStartsAt(toLocalDateTime(session.applicationStartsAt));
      setApplicationEndsAt(toLocalDateTime(session.applicationEndsAt));
      setStartsAt(toLocalDateTime(session.startsAt)); setEndsAt(toLocalDateTime(session.endsAt));
    }
  }, [selected]);
  const update = useMutation({
    mutationFn: ({ url, body }: { url: string; body: unknown }) => customFetch(url, {
      method: "PATCH", responseType: "json", credentials: "include",
      body: JSON.stringify(body),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "programs"] }),
  });
  const columns: ColumnDef<Program>[] = [
    { key: "code", header: "코드" },
    { key: "name", header: "프로그램명", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "programType", header: "유형" },
    { key: "programSessions", header: "회차", cell: (row) => `${row.programSessions?.length ?? 0}개` },
    { key: "status", header: "상태", cell: (row) => <StatusBadge status={displayStatus(row.status)} /> },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="프로그램 관리" description="프로그램 신청자격·이수기준과 회차별 신청기간·정원을 관리합니다." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {programs.isLoading && (
          <LoadingCard message="프로그램 목록을 불러오는 중입니다." />
        )}
        {programs.isError && (
          <ErrorCard
            message="프로그램 API에 연결할 수 없습니다."
            onRetry={() => programs.refetch()}
            isRetrying={programs.isFetching}
          />
        )}
        {!programs.isLoading && !programs.isError && (
          <DataTable
            data={programs.data?.data ?? []}
            columns={columns}
            highlightId={highlightId}
            highlightMissingMessage="해당 프로그램을 찾을 수 없습니다."
            onRowClick={(row) => {
              setSelected(programs.data?.data.find((item) => item.id === row.id));
            }}
          />
        )}
        <aside className="space-y-5 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">프로그램 상세 편집</h2>
          {!selected ? <p className="text-sm text-muted-foreground">왼쪽에서 프로그램을 선택하세요.</p> : <>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="프로그램명" />
            <Input value={programType} onChange={(e) => setProgramType(e.target.value)} placeholder="프로그램 유형" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명" />
            <Input value={departmentCodes} onChange={(e) => setDepartmentCodes(e.target.value)} placeholder="신청 가능 학과코드(쉼표 구분)" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={minimumGrade} onChange={(e) => setMinimumGrade(e.target.value)} placeholder="최소 학년" />
              <Input type="number" value={maximumGrade} onChange={(e) => setMaximumGrade(e.target.value)} placeholder="최대 학년" />
              <Input type="number" value={attendanceRate} onChange={(e) => setAttendanceRate(e.target.value)} placeholder="최소 출석률" />
              <Input type="number" value={assignmentScore} onChange={(e) => setAssignmentScore(e.target.value)} placeholder="최소 과제점수" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={surveyRequired} onChange={(e) => setSurveyRequired(e.target.checked)} />
              만족도조사 제출 필수
            </label>
            <Button className="w-full" disabled={selected.status !== "DRAFT" || update.isPending} onClick={() => update.mutate({
              url: `/api/v1/programs/${selected.id}`,
              body: {
                name, description: description || undefined, programType,
                eligibilityRules: {
                  departmentCodes: departmentCodes.split(",").map((value) => value.trim()).filter(Boolean),
                  minimumGrade: minimumGrade ? Number(minimumGrade) : undefined,
                  maximumGrade: maximumGrade ? Number(maximumGrade) : undefined,
                },
                completionRules: {
                  minimumAttendanceRate: attendanceRate ? Number(attendanceRate) : undefined,
                  minimumAssignmentScore: assignmentScore ? Number(assignmentScore) : undefined,
                  surveyRequired,
                },
              },
            })}>프로그램 저장</Button>
            <div className="border-t pt-4">
              <h3 className="mb-3 font-medium">첫 회차 상세 편집</h3>
              <div className="space-y-2">
                <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="회차명" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="정원" />
                  <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="장소" />
                </div>
                <label className="block text-xs">신청 시작<Input type="datetime-local" value={applicationStartsAt} onChange={(e) => setApplicationStartsAt(e.target.value)} /></label>
                <label className="block text-xs">신청 종료<Input type="datetime-local" value={applicationEndsAt} onChange={(e) => setApplicationEndsAt(e.target.value)} /></label>
                <label className="block text-xs">운영 시작<Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
                <label className="block text-xs">운영 종료<Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></label>
                <Button className="w-full" variant="outline" disabled={!sessionId || selected.programSessions[0]?.status !== "DRAFT" || update.isPending} onClick={() => update.mutate({
                  url: `/api/v1/program-sessions/${sessionId}`,
                  body: {
                    name: sessionName, capacity: Number(capacity), venue: venue || undefined,
                    applicationStartsAt: new Date(applicationStartsAt).toISOString(),
                    applicationEndsAt: new Date(applicationEndsAt).toISOString(),
                    startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(),
                  },
                })}>회차 저장</Button>
              </div>
            </div>
          </>}
          {update.isError && <p className="text-sm text-destructive">{update.error.message}</p>}
        </aside>
      </div>
    </PortalLayout>
  );
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
