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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export default function PartnerSurvey() {
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState("");
  const [topics, setTopics] = useState("");
  const [headcount, setHeadcount] = useState(0);
  const [fieldPractice, setFieldPractice] = useState(false);
  const [internship, setInternship] = useState(false);
  const [employment, setEmployment] = useState(false);
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true"),
  });
  const yearId = years.data?.data[0]?.id;
  const surveys = useQuery({
    queryKey: ["partner", "company-participations", yearId, "DEMAND_SURVEY"],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(
      CompanyParticipationListResponseSchema,
      `/api/v1/company-participations?businessYearId=${yearId}&participationType=DEMAND_SURVEY`,
      { credentials: "include" },
    ),
  });
  const createSurvey = useMutation({
    mutationFn: () => customFetch("/api/v1/company-participations", {
      method: "POST", responseType: "json", credentials: "include",
      body: JSON.stringify({
        businessYearId: yearId,
        participationType: "DEMAND_SURVEY",
        title: `${new Date().toLocaleDateString("ko-KR")} 기업 수요조사`,
        participantCount: headcount,
        details: {
          requiredSkills: skills.split(",").map((item) => item.trim()).filter(Boolean),
          projectTopics: topics.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
          canFieldPractice: fieldPractice,
          canInternship: internship,
          canEmploy: employment,
          requiredHeadcount: headcount,
        },
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner", "company-participations"] });
      setSkills(""); setTopics(""); setHeadcount(0);
      setFieldPractice(false); setInternship(false); setEmployment(false);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (yearId && skills.trim()) createSurvey.mutate();
  }
  return (
    <PortalLayout>
      <SectionHeader title="기업 수요조사" description="교육과정 설계와 채용 연계에 필요한 기업 수요를 등록합니다." />
      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <Card><CardContent className="pt-6">
          <form className="space-y-5" onSubmit={submit}>
            <FormField label="필요 기술" required><Input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Python, ROS2, 컴퓨터비전" /></FormField>
            <FormField label="산학 프로젝트 주제"><textarea className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={topics} onChange={(event) => setTopics(event.target.value)} placeholder="한 줄에 하나의 주제" /></FormField>
            <FormField label="예상 필요인원"><Input type="number" min={0} value={headcount} onChange={(event) => setHeadcount(Number(event.target.value))} /></FormField>
            <div className="space-y-3 rounded-md border p-4 text-sm">
              {[
                ["현장실습 제공 가능", fieldPractice, setFieldPractice],
                ["인턴십 제공 가능", internship, setInternship],
                ["채용 연계 가능", employment, setEmployment],
              ].map(([label, checked, setter]) => (
                <label key={String(label)} className="flex items-center gap-2">
                  <Checkbox checked={Boolean(checked)} onCheckedChange={(value) => (setter as (value: boolean) => void)(value === true)} />{String(label)}
                </label>
              ))}
            </div>
            <Button className="w-full" disabled={!yearId || !skills.trim() || createSurvey.isPending}>수요조사 제출</Button>
            {createSurvey.isError && <p className="text-sm text-destructive">{createSurvey.error.message}</p>}
          </form>
        </CardContent></Card>
        <div className="space-y-3">
          {(surveys.data?.data ?? []).map((survey) => (
            <Card key={survey.id}><CardContent className="p-5"><h2 className="font-medium">{survey.title}</h2><p className="mt-2 text-sm text-muted-foreground">필요 기술: {survey.details.requiredSkills?.join(", ") || "-"}</p></CardContent></Card>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
