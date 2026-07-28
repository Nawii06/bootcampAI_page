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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ErrorCard";
import { NoActiveYearNotice } from "@/components/NoActiveYearNotice";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useFormDraft } from "@/hooks/useFormDraft";

export default function PartnerProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState("autonomous");
  const [problem, setProblem] = useState("");
  const [dataTypes, setDataTypes] = useState("");
  const [outputs, setOutputs] = useState("");
  const [mentorRole, setMentorRole] = useState("");

  const { clearDraft } = useFormDraft(
    "/partner/project",
    { title, track, problem, dataTypes, outputs, mentorRole },
    (draft) => {
      if (draft.title) setTitle(draft.title);
      if (draft.track) setTrack(draft.track);
      if (draft.problem) setProblem(draft.problem);
      if (draft.dataTypes) setDataTypes(draft.dataTypes);
      if (draft.outputs) setOutputs(draft.outputs);
      if (draft.mentorRole) setMentorRole(draft.mentorRole);
    },
    (clear, info) => {
      const draftAgeDays = Math.floor(info.draftAgeMs / (24 * 60 * 60 * 1000));
      toast({
        title: "이전에 작성 중이던 내용을 불러왔습니다",
        ...(info.isNearExpiry
          ? {
              description: `${draftAgeDays}일 전에 저장된 임시저장본입니다. 24시간 내에 만료되니 지금 제출하거나 내용을 수정해 다시 저장해 주세요.`,
              className: "border-yellow-500 bg-yellow-50 text-yellow-900",
            }
          : {}),
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              setTitle("");
              setTrack("autonomous");
              setProblem("");
              setDataTypes("");
              setOutputs("");
              setMentorRole("");
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const noOpenPeriod = years.isSuccess && years.data.data.length === 0;
  const projects = useQuery({
    queryKey: ["partner", "company-participations", yearId, "PROJECT"],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(
      CompanyParticipationListResponseSchema,
      `/api/v1/company-participations?businessYearId=${yearId}&participationType=PROJECT`,
      { credentials: "include" },
    ),
  });
  const createProject = useMutation({
    mutationFn: () => customFetch("/api/v1/company-participations", {
      method: "POST", responseType: "json", credentials: "include",
      body: JSON.stringify({
        businessYearId: yearId,
        participationType: "PROJECT",
        title,
        details: {
          track,
          problemDefinition: problem,
          dataTypes: dataTypes.split(",").map((item) => item.trim()).filter(Boolean),
          expectedOutputs: outputs.split(",").map((item) => item.trim()).filter(Boolean),
          mentorRole,
          status: "PROPOSED",
        },
      }),
    }),
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["partner", "company-participations"] });
      setTitle(""); setProblem(""); setDataTypes(""); setOutputs(""); setMentorRole("");
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (yearId && title.trim() && problem.trim()) createProject.mutate();
  }
  return (
    <PortalLayout>
      <SectionHeader title="산업체 프로젝트 제안" description="PBL·캡스톤디자인에 활용할 산업체 문제를 제안합니다." />
      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <Card><CardContent className="pt-6"><form className="space-y-4" onSubmit={submit}>
          {noOpenPeriod && (
            <NoActiveYearNotice message="현재 진행 중인 프로젝트 제안 기간이 없습니다. 제안 기간이 열리면 제출할 수 있습니다." />
          )}
          <FormField label="과제명" required><Input value={title} onChange={(event) => setTitle(event.target.value)} /></FormField>
          <FormField label="트랙"><select className="h-10 w-full rounded-md border bg-background px-3" value={track} onChange={(event) => setTrack(event.target.value)}><option value="autonomous">자율주행</option><option value="aviation">항공 모빌리티</option><option value="railway">철도 모빌리티</option><option value="infra">스마트 인프라</option></select></FormField>
          <FormField label="문제 정의" required><Textarea rows={4} value={problem} onChange={(event) => setProblem(event.target.value)} /></FormField>
          <FormField label="제공 데이터 유형"><Input value={dataTypes} onChange={(event) => setDataTypes(event.target.value)} placeholder="영상, 센서 로그" /></FormField>
          <FormField label="기대 산출물"><Input value={outputs} onChange={(event) => setOutputs(event.target.value)} placeholder="모델, 보고서, 데모" /></FormField>
          <FormField label="기업 멘토 역할"><Textarea rows={2} value={mentorRole} onChange={(event) => setMentorRole(event.target.value)} /></FormField>
          <Button className="w-full" disabled={!yearId || !title.trim() || !problem.trim() || createProject.isPending}>프로젝트 제안 제출</Button>
          {createProject.isError && <p className="text-sm text-destructive">{createProject.error.message}</p>}
        </form></CardContent></Card>
        <div className="space-y-3">
          {years.isError && (
            <ErrorCard
              message="사업연도 정보를 불러오지 못했습니다."
              onRetry={() => years.refetch()}
              isRetrying={years.isFetching}
            />
          )}
          {projects.isError && (
            <ErrorCard
              message="제안한 프로젝트 목록을 불러오지 못했습니다."
              onRetry={() => projects.refetch()}
              isRetrying={projects.isFetching}
            />
          )}
          {projects.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : (projects.data?.data ?? []).map((project) => (
                <Card key={project.id}>
                  <CardContent className="p-5">
                    <div className="flex justify-between">
                      <h2 className="font-medium">{project.title}</h2>
                      <Badge variant="secondary">{project.details.track ?? "트랙 미지정"}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{project.details.problemDefinition}</p>
                  </CardContent>
                </Card>
              ))}
          {!years.isLoading && !projects.isLoading && !years.isError && !projects.isError &&
            (yearId === undefined || (projects.data?.data ?? []).length === 0) && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {noOpenPeriod ? "현재 진행 중인 프로젝트 제안 기간이 없습니다." : "제안한 프로젝트가 없습니다."}
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </PortalLayout>
  );
}
